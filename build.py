import argparse
import os
import shutil
import subprocess
import sys

from jsmin import jsmin

DIRNAME = os.path.dirname(__file__)

def main(version):
    if not os.path.isdir('build'):
        os.mkdir('build')

    # Prepare DOMBuilder
    shutil.copyfile('DOMBuilder.js', 'build/dombuilder-%s.js' % version)
    with open('build/dombuilder-%s.min.js' % version, 'w') as minfile, \
         open('build/dombuilder-%s.js' % version, 'r') as maxfile:
        minfile.write(jsmin(maxfile.read()))
    
    # Prepare the demo document
    with open('build/demo.html', 'w') as outfile, \
         open('demo.html', 'r') as infile:
        outfile.write(infile.read().replace('DOMBuilder.js',
                                            'dombuilder-%s.js' % version))

    # Generate docs
    if not os.path.isdir('build/docs'):
        os.mkdir('build/docs')
    subprocess.call([os.path.abspath('docs/make.bat'), 'html'], cwd=os.path.abspath('docs'))
    if os.path.isdir('build/docs'):
        shutil.rmtree('build/docs')
    shutil.copytree('docs/_build/html', 'build/docs',
                    ignore=shutil.ignore_patterns('.buildinfo', 'objects.inv'))

    # Copy files to be distributed as-is
    for filename in ['CHANGELOG']:
        shutil.copy(filename, 'build')

    # Zip everything up
    if not os.path.isdir('dist'):
        os.mkdir('dist')
    shutil.make_archive('dist/DOMBuilder-%s' % version, 'zip', 'build')

    # Clean up
    shutil.rmtree('build')

if __name__ == '__main__':
    main(sys.argv[1])
