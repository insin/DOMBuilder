var http = require("http"),
    DOMBuilder = require("../lib/dombuilder");

with (DOMBuilder.elements) {
  var fragment = DOMBuilder.fragment(STRONG("Hello from an ",
                                     CODE("HTMLFragment")),
                                     " with sibling nodes");
  var html =
    '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">' +
    HTML({lang: "en"},
      HEAD(
        TITLE("DOMBuilder Demo Page"),
        META({"http-equiv": "Content-Type", content: "text/html; charset=UTF-8"}),
        META({name: "Author", content: "Jonathan Buchanan"}),
        STYLE({type:"text/css"},
          "html { margin: 0; padding: 0; }\
          body { padding: 1em 5%; font-family: sans-serif; }\
          h1, h2 { color: #69c; font-family: sans-serif; border-bottom: 1px solid #000; }\
          h1 { font-size: 160%; margin: 0em 0 1em -3%; }\
          h2 { font-size: 140%; margin: 1em 0 1em -2%; }\
          .testClass { background-color: #ddd; }"
        )),
    BODY(
      H1("DOMBuilder Demo Page"),
      H2("W3C Example Table"),
      TABLE({border: 2, frame: "hsides", rules: "groups",
             summary: "Code page support in different versions of MS Windows."},
        CAPTION("CODE-PAGE SUPPORT IN MICROSOFT WINDOWS"),
        COLGROUP({align: "center"}),
        COLGROUP({align: "left"}),
        COLGROUP({align: "center", span: 2}),
        COLGROUP({align: "center", span: 3}),
        THEAD({valign: "top"},
          TR(
            TH("Code-Page", BR(), "ID"),
            TH("Name"),
            TH("ACP"),
            TH("OEMCP"),
            TH("Windows", BR(), "NT 3.1"),
            TH("Windows", BR(), "NT 3.51"),
            TH("Windows", BR(), "95")
          )
        ),
        TBODY(
          TR(TD(1200), TD("Unicode (BMP of ISO/IEC-10646)"), TD(),    TD(), TD("X"), TD("X"),  TD("*")),
          TR(TD(1250), TD("Windows 3.1 Eastern European"),   TD("X"), TD(), TD("X"), TD("X"),  TD("X")),
          TR(TD(1251), TD("Windows 3.1 Cyrillic"),           TD("X"), TD(), TD("X"), TD("X"),  TD("X")),
          TR(TD(1252), TD("Windows 3.1 US (ANSI)"),          TD("X"), TD(), TD("X"), TD("X"),  TD("X")),
          TR(TD(1253), TD("Windows 3.1 Greek"),              TD("X"), TD(), TD("X"), TD("X"),  TD("X")),
          TR(TD(1254), TD("Windows 3.1 Turkish"),            TD("X"), TD(), TD("X"), TD("X"),  TD("X")),
          TR(TD(1255), TD("Hebrew"),                         TD("X"), TD(), TD(),    TD(),     TD("X")),
          TR(TD(1256), TD("Arabic"),                         TD("X"), TD(), TD(),    TD(),     TD("X")),
          TR(TD(1257), TD("Baltic"),                         TD("X"), TD(), TD(),    TD(),     TD("X")),
          TR(TD(1361), TD("Korean (Johab)"),                 TD("X"), TD(), TD(),    TD("**"), TD("X"))
        ),
        TBODY(
          TR(TD(437), TD("MS-DOS United States"),        TD(), TD("X"), TD("X"), TD("X"), TD("X")),
          TR(TD(708), TD("Arabic (ASMO 708)"),           TD(), TD("X"), TD(),    TD(),    TD("X")),
          TR(TD(709), TD("Arabic (ASMO 449+, BCON V4)"), TD(), TD("X"), TD(),    TD(),    TD("X")),
          TR(TD(710), TD("Arabic (Transparent Arabic)"), TD(), TD("X"), TD(),    TD(),    TD("X")),
          TR(TD(720), TD("Arabic (Transparent ASMO)"),   TD(), TD("X"), TD(),    TD(),    TD("X"))
        )
      ),
      H2("HTML Generation"),
      DIV({"class": "article"},
       H3("This section was generated using ", CODE("DOMBuilder.withNode"), " and ", CODE("innerHTML")),
       P("Special characters should be escaped by default: < > \" ' &"),
       P(DOMBuilder.html.markSafe("But you can <strong>prevent Strings being escaped</strong> using <code>DOMBuilder.html.markSafe</code>")),
       H3(CODE("HTMLFragment"), " section"),
       P("Cloned fragment: ", fragment.cloneNode(true)),
       P("Original fragment has a length of: ", STRONG(fragment.childNodes.length)),
       P("Original fragment: ", fragment),
       P("Original fragment now has a length of: ", STRONG(fragment.childNodes.length)),
       EM(DOMBuilder.html.markSafe(DOMBuilder.fragment("toString() from an ", CODE("HTMLFragment"), " with sibling nodes").toString()))
      ))
    );
}

http.createServer(function (req, res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  res.end(html);
}).listen(8000);

console.log("Using DOMBuilder " + DOMBuilder.version);
console.log("Server running at http://127.0.0.1:8000/");
