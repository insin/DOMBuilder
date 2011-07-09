import re

VERSION_RE = re.compile(r"version: '(.+)'")

TEMPLATE = """/**
 * DOMBuilder {version} (modes: {modes}) - https://github.com/insin/DOMBuilder
 * MIT licensed
 */
{code}
DOMBuilder.mode = '{mode}';"""

def main():
    base = open('lib/DOMBuilder.js').read()
    dom = open('lib/DOMBuilder.dom.js').read()
    html = open('lib/DOMBuilder.html.js').read()
    template = open('lib/DOMBuilder.template.js').read()

    version = VERSION_RE.search(base).group(1)

    # Uncompressed DOM+HTML
    open('DOMBuilder.js', 'w').write(TEMPLATE.format(
        version=version, mode='dom', modes='dom [default], html',
        code=(base + dom + html)
    ))
    # DOM+HTML
    open('DOMBuilder.min.js', 'w').write(TEMPLATE.format(
        version=version, mode='dom', modes='dom [default], html',
        code=compress(base + dom + html)
    ))
    # DOM-only
    open('DOMBuilder.dom.min.js', 'w').write(TEMPLATE.format(
        version=version, mode='dom', modes='dom', code=compress(base + dom)
    ))
    # HTML-only
    open('DOMBuilder.html.min.js', 'w').write(TEMPLATE.format(
        version=version, mode='html', modes='html', code=compress(base + html)
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
