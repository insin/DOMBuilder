import re

VERSION_RE = re.compile(r"version: '(.+)'")

TEMPLATE = """/**
 * DOMBuilder {version} (modes: {modes}) - https://github.com/insin/DOMBuilder
 * MIT licensed
 */
{code}"""

def main():
    dom = open('lib/DOMBuilder.js').read()
    html = open('lib/DOMBuilder.html.js').read()
    template = open('lib/DOMBuilder.template.js').read()

    version = VERSION_RE.search(dom).group(1)

    open('DOMBuilder.min.js', 'w').write(TEMPLATE.format(
        version=version, modes='dom', code=compress(dom)
    ))
    open('DOMBuilder.html.min.js', 'w').write(TEMPLATE.format(
        version=version, modes='dom, html', code=compress(dom + html)
    ))
    open('DOMBuilder.template.min.js', 'w').write(TEMPLATE.format(
        version=version, modes='dom, html, template', code=compress(dom + html + template)
    ))

def compress(js):
    """Optimises and compresses with the Google Closure Compiler."""
    import httplib, urllib, sys
    params = urllib.urlencode([
        ('js_code', js),
        ('compilation_level', 'SIMPLE_OPTIMIZATIONS'),
        ('output_format', 'text'),
        ('output_info', 'compiled_code'),
      ])
    headers = { "Content-type": "application/x-www-form-urlencoded" }
    conn = httplib.HTTPConnection('closure-compiler.appspot.com')
    conn.request('POST', '/compile', params, headers)
    response = conn.getresponse()
    return response.read()

if __name__ == '__main__':
    main()
