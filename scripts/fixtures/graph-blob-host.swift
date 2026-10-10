import AppKit
import WebKit

let root=URL(fileURLWithPath:CommandLine.arguments[1],isDirectory:true)
let app=NSApplication.shared
app.setActivationPolicy(.prohibited)
final class Assets:NSObject,WKURLSchemeHandler {
  func webView(_ web:WKWebView,start task:WKURLSchemeTask) {
    guard let url=task.request.url,let data=try? Data(contentsOf:root.appendingPathComponent(url.path)) else {task.didFailWithError(URLError(.fileDoesNotExist));return}
    let mime=["html":"text/html","js":"text/javascript","wasm":"application/wasm"][url.pathExtension] ?? "application/octet-stream"
    task.didReceive(HTTPURLResponse(url:url,statusCode:200,httpVersion:"HTTP/1.1",headerFields:["Content-Type":mime,"Access-Control-Allow-Origin":"*"])!)
    task.didReceive(data);task.didFinish()
  }
  func webView(_ web:WKWebView,stop task:WKURLSchemeTask) {}
}
let config=WKWebViewConfiguration()
config.websiteDataStore = .nonPersistent()
config.setURLSchemeHandler(Assets(),forURLScheme:"floe-graph")
let web=WKWebView(frame:NSRect(x:0,y:0,width:640,height:480),configuration:config)
web.load(URLRequest(url:URL(string:"floe-graph://bundle/index.html")!))
Timer.scheduledTimer(withTimeInterval:0.1,repeats:true){_ in
  web.evaluateJavaScript("window.failure || (window.result && window.result.length===2 && window.result[0].edges[0].sections[0].length>=2 ? 'passed' : '')"){value,error in
    if let value=value as? String,!value.isEmpty {print(value);exit(value=="passed" ? 0:1)}
  }
}
DispatchQueue.main.asyncAfter(deadline:.now()+20){print("Native graph deadline exceeded");exit(1)}
app.run()
