import os
import re
import sys
import time
import pyinotify

# This is a simple script to watch for changes in this directory, and to
# rebuild the sphinx docs when a change occurs.

class HandleEvents(pyinotify.ProcessEvent):
    exclude = [
        re.compile("^.*\.swp$"),
        re.compile("^.*~$"),
        re.compile("^%s$" % os.path.abspath(__file__)),
    ]
    timeout = 1 # seconds to wait between changes
    previous_run = 0

    def process_IN_CREATE(self, event):
        self.rebuild(event)

    def process_IN_DELETE(self, event):
        self.rebuild(event)

    def process_IN_MODIFY(self, event):
        self.rebuild(event)

    def rebuild(self, event):
        if not os.path.exists(event.pathname):
            return
        for pattern in self.exclude:
            if pattern.match(event.pathname):
                return
        if time.time() - self.previous_run > self.timeout:
            self.previous_run = time.time()
            self.execute(event.pathname)

    def execute(self, path):
        os.system("make html")

if __name__ == "__main__":
    wm = pyinotify.WatchManager()
    notifier = pyinotify.Notifier(wm, HandleEvents())
    wm.add_watch('.', 
            pyinotify.IN_DELETE | pyinotify.IN_MODIFY | pyinotify.IN_CREATE,
            rec=True)
    notifier.loop()
