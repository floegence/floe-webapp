package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"

	flowersec "github.com/floegence/flowersec/flowersec-go/v5"
	"github.com/floegence/flowersec/flowersec-go/v5/controlplane"
)

// HTTP smoke exercises two separately admitted clients through the released API.
func runHTTP() {
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		fail("HTTP listener creation failed")
	}
	defer listener.Close()
	origin := "http://" + listener.Addr().String()
	var records sync.Map
	var issuedCount atomic.Int32
	released := make(chan struct{}, 2)
	handlers, err := flowersec.NewSessionHandlers(flowersec.SessionHandlerOptions{})
	if err != nil {
		fail("HTTP session handlers failed")
	}
	if err := handlers.HandleRPC(7001, func(context.Context, json.RawMessage) (any, *flowersec.RPCError) {
		return map[string]string{"server": "http-direct"}, nil
	}); err != nil {
		fail("HTTP RPC registration failed")
	}
	acceptor, err := flowersec.NewAcceptor(flowersec.AcceptorOptions{
		Authorize: func(_ context.Context, req controlplane.RuntimeAuthorizationRequest) (controlplane.AuthorizationResponse, error) {
			record, ok := records.LoadAndDelete(req.LookupKey())
			if !ok {
				return controlplane.AuthorizationResponse{}, errors.New("unknown or consumed admission")
			}
			return controlplane.AuthorizeRuntime(req, record.(controlplane.AuthorizationRecord), req.LookupKey())
		},
		ResolveHandlers: func(context.Context, controlplane.RuntimeAuthorizationRequest) (*flowersec.SessionHandlers, error) {
			return handlers, nil
		},
		Release: func(context.Context, string) { released <- struct{}{} },
		OnSession: func(ctx context.Context, s flowersec.Session, _ string) error {
			_, err := s.WaitTermination(ctx)
			return err
		},
	})
	if err != nil {
		fail("HTTP acceptor failed")
	}
	transport, err := acceptor.HTTPDirectHandler(flowersec.HTTPDirectHandlerOptions{AuthorizeRequest: func(r *http.Request) bool { return r.Host == listener.Addr().String() }})
	if err != nil {
		fail("HTTP transport failed")
	}
	app := http.NewServeMux()
	app.HandleFunc("/v1/connect/artifact", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "POST required", 405)
			return
		}
		id := issuedCount.Add(1)
		issued, err := controlplane.NewIssuer().IssueHTTPDirect(controlplane.HTTPDirectIssueOptions{
			Session:           controlplane.SessionOptions{ChannelID: fmt.Sprintf("http-%d", id), ExpiresAt: time.Now().Add(time.Minute)},
			Endpoint:          "ws://" + listener.Addr().String() + flowersec.WebSocketDirectPath,
			RendezvousGroupID: fmt.Sprintf("group-%d", id), ListenerAudience: "floe-http-smoke", UpstreamAddress: listener.Addr().String(),
		})
		if err != nil {
			http.Error(w, "issuance failed", 500)
			return
		}
		records.Store(issued.LookupKey(), issued.AuthorizationRecord())
		artifact := string(issued.ArtifactJSON())
		projection, _ := json.Marshal(map[string]any{"scope": "proxy.runtime", "scope_version": 2, "critical": true, "payload": map[string]any{"mode": "controller_bridge", "controllerBridge": map[string]any{"allowedOrigins": []string{origin}}}})
		envelope := map[string]any{"v": 1, "connect_artifact": artifact, "critical_scope_projection_json": string(projection), "spend_scope": map[string]any{
			"v": 1, "receipt": "r1.http-smoke." + digestString(artifact), "artifact_digest_b64u": digestString(artifact), "projection_digest_b64u": digestString(string(projection)),
			"launcher_origin": origin, "runtime_origin": origin, "app_origin": origin, "consumer": "trusted", "target_binding": map[string]any{"smoke": true}, "expires_at": time.Now().Add(time.Minute).UTC().Format(time.RFC3339),
		}}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(envelope)
	})
	server, err := flowersec.NewHTTPDirectServer(flowersec.HTTPDirectServerOptions{Handler: transport, ApplicationHandler: app})
	if err != nil {
		fail("HTTP server failed")
	}
	defer server.Close()
	errorsCh := make(chan error, 1)
	go func() { errorsCh <- server.Serve(listener) }()
	if err := json.NewEncoder(os.Stdout).Encode(map[string]string{"http_origin": origin}); err != nil {
		fail("HTTP readiness failed")
	}
	for range 2 {
		select {
		case <-released:
		case <-errorsCh:
			fail("HTTP server stopped early")
		case <-time.After(30 * time.Second):
			fail("HTTP sessions did not close")
		}
	}
}

func digestString(value string) string {
	sum := sha256.Sum256([]byte(value))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
