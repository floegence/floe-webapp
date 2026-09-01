package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	flowersec "github.com/floegence/flowersec/flowersec-go/v4"
	"github.com/floegence/flowersec/flowersec-go/v4/controlplane"
)

const allowedOrigin = "https://app.example.com"

type readyMessage struct {
	Artifact string `json:"artifact"`
	CAPEM    string `json:"ca_pem"`
}

func main() {
	serverTLS, caPEM, err := testTLS()
	if err != nil {
		fail("TLS fixture creation failed")
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fail("listener creation failed")
	}
	defer listener.Close()

	var record controlplane.AuthorizationRecord
	sessionDone := make(chan struct{})
	var sessionOnce sync.Once
	acceptor, err := flowersec.NewAcceptor(flowersec.AcceptorOptions{
		AllowedOrigins:    []string{allowedOrigin},
		MaxInboundStreams: 8,
		Authorize: func(_ context.Context, request controlplane.RuntimeAuthorizationRequest) (controlplane.AuthorizationResponse, error) {
			return controlplane.AuthorizeRuntime(request, record, "release-smoke")
		},
		Release: func(context.Context, string) {},
		OnSession: func(ctx context.Context, session flowersec.Session, _ string) error {
			_, waitErr := session.WaitTermination(ctx)
			sessionOnce.Do(func() { close(sessionDone) })
			return waitErr
		},
	})
	if err != nil {
		fail("acceptor creation failed")
	}
	server, err := flowersec.NewWebSocketHTTPServer(flowersec.WebSocketHTTPServerOptions{
		Handler:   acceptor.Handler(),
		TLSConfig: serverTLS,
	})
	if err != nil {
		fail("WebSocket server creation failed")
	}
	defer server.Close()

	address, ok := listener.Addr().(*net.TCPAddr)
	if !ok {
		fail("listener address unavailable")
	}
	endpointURL := fmt.Sprintf("wss://127.0.0.1:%d%s", address.Port, flowersec.WebSocketDirectPath)
	endpoints, err := controlplane.NewEndpointSet(controlplane.EndpointConfig{
		ID:  "release-smoke",
		URL: endpointURL,
		TLS: controlplane.CAPolicy(),
	})
	if err != nil {
		fail("endpoint creation failed")
	}
	issued, err := controlplane.NewIssuer().IssueDirect(controlplane.DirectIssueOptions{
		Session: controlplane.SessionOptions{
			ChannelID:         "floe-release-smoke",
			ExpiresAt:         time.Now().Add(time.Minute),
			MaxInboundStreams: 8,
		},
		Endpoints:         endpoints,
		RendezvousGroupID: "floe-release-smoke-group",
		ListenerAudience:  "floe-release-smoke-listener",
		UpstreamAddress:   "127.0.0.1:9000",
	})
	if err != nil {
		fail("artifact issuance failed")
	}
	record = issued.AuthorizationRecord()

	serveResult := make(chan error, 1)
	go func() { serveResult <- server.Serve(listener) }()
	if err := json.NewEncoder(os.Stdout).Encode(readyMessage{
		Artifact: string(issued.ArtifactJSON()),
		CAPEM:    string(caPEM),
	}); err != nil {
		fail("ready output failed")
	}

	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signals)
	select {
	case <-sessionDone:
	case <-signals:
	case err := <-serveResult:
		if !errors.Is(err, http.ErrServerClosed) {
			fail("WebSocket server failed")
		}
	case <-time.After(30 * time.Second):
		fail("session close timed out")
	}
	if err := server.Close(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fail("WebSocket server close failed")
	}
}

func testTLS() (*tls.Config, []byte, error) {
	now := time.Now().UTC()
	caKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	caTemplate := &x509.Certificate{
		SerialNumber:          randomSerial(),
		Subject:               pkix.Name{CommonName: "Floe release smoke CA"},
		NotBefore:             now.Add(-time.Minute),
		NotAfter:              now.Add(time.Hour),
		KeyUsage:              x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature,
		BasicConstraintsValid: true,
		IsCA:                  true,
	}
	caDER, err := x509.CreateCertificate(rand.Reader, caTemplate, caTemplate, &caKey.PublicKey, caKey)
	if err != nil {
		return nil, nil, err
	}
	leafKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, nil, err
	}
	leafTemplate := &x509.Certificate{
		SerialNumber: randomSerial(),
		Subject:      pkix.Name{CommonName: "127.0.0.1"},
		NotBefore:    now.Add(-time.Minute),
		NotAfter:     now.Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
	}
	leafDER, err := x509.CreateCertificate(rand.Reader, leafTemplate, caTemplate, &leafKey.PublicKey, caKey)
	if err != nil {
		return nil, nil, err
	}
	certificate := tls.Certificate{
		Certificate: [][]byte{leafDER, caDER},
		PrivateKey:  leafKey,
	}
	caPEM := pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: caDER})
	if caPEM == nil {
		return nil, nil, errors.New("CA PEM encoding failed")
	}
	return &tls.Config{Certificates: []tls.Certificate{certificate}, MinVersion: tls.VersionTLS13}, caPEM, nil
}

func randomSerial() *big.Int {
	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		fail("certificate serial generation failed")
	}
	return serial
}

func fail(message string) {
	_, _ = fmt.Fprintln(os.Stderr, message)
	os.Exit(1)
}
