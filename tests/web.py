import os
from django.conf import settings
DIRNAME = os.path.dirname(__file__)
if not settings.configured:
    settings.configure(
        DEBUG = True,
        ROOT_URLCONF = 'web',
        TEMPLATE_DIRS = [DIRNAME],
        # Override to exclude CSRF middleware
        MIDDLEWARE_CLASSES = ('django.middleware.common.CommonMiddleware',),
    )

from django.conf.urls.defaults import patterns
urlpatterns = patterns('',
    (r'^$', 'web.echo_post'),
    (r'^(?P<path>DOMBuilder.js)$', 'django.views.static.serve', {'document_root': DIRNAME}),
)

from django.shortcuts import render_to_response
def echo_post(request):
    if request.method == 'POST':
        for param, values in request.POST.lists():
            print('{}: {}'.format(param, ', '.join(values)))
    return render_to_response('demo.html', {})

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    execute_from_command_line([__file__, 'runserver'])
