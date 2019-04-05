# Assignment #1

### Step 1:  Begin with these steps to repository setup:

1. By now you have followed the link to create your assignment repository at https://classroom.github.com/a/wamrBrAf. Please use this link once as it will create a repository.  We will not check for submissions if you use it multiple times. The repository name should look like **a1-githubusername**. Any others will get removed.

2. As part of this process you will also receive an invite from GitHub to join the class organization which is where more of your class assignments and term project will live.

3. Once your repository is created you will have a copy of the assignment code in your GitHub repository. Find the big green button on the page that says "Clone or download". Now you can clone the repository onto your local computer.  There are three ways to do this:

- The easy way (not for extra credit): Click that green button and select "Download ZIP".

- The medium way:  (extra credit) Install GitHub Desktop on your computer, then click that green button on your repo and select "Open in Desktop".

- The hard way:  Just use git (the command line) rather than GitHub Desktop if you are comfortable with that.  Be sure to setup your local git environment and ssh keys to work with the GitHub site, by following their instructions. Use the following command. Be sure do execute this command from the directory you wish to locate your work.

```bash
$ git clone git@github.com:ucla-fa18-cs174a/a1-githubusername.git
```

4. You can now follow the remaining steps of the assignment.

### Step 2:  Now follow these steps to run and modify your project:  

1. Go to your folder.

   ![icons](docs/image-01.png)

2. You should see the file index.html in your folder.  You can already try clicking that open to see the code run on your machine... mostly.  This is a start; you'll see an animation.  But this isn't good enough.  Your animation is still unable to load local files (texture images, sounds, models) out of your own file-system, due to its safety protections against your web browser.

   ![triangle](docs/image-02.png)

3. Run a fake server. which lacks those security protections.  Do this by opening the file we gave you called "host" -  "host.bat" if you're Windows, "host.command" if your Mac. On Windows you can just double click the file open.
   * **On Mac, you might get a security warning instead if you double-click.**  Instead, right click the files (that's correct - right click.  It matters how you click!)  Then choose Open, or you can go into System Preferences/Security & Privacy/General and click 'Open Anyway'. Let us know if it still doesn't work.

   ![dialog](docs/image-03.png)

4. Look in the resulting console window.  If the console window immediately disappeared, or if you can't find a message in it starting with "Serving HTTP on ...", your operating system might not have come with Python; go download and install that first -- use Google for help on that, then try our files again.

   ![http server](docs/image-04.png)

5. Now you're hosting. Keep that window open.

6. Open a new window of Google Chrome.  Download it first if needed.

   ![url bar](docs/image-05.png)

7. Navigate Chrome to the url http://localhost:8000/
That assumes that step 5's message said port 8000 - otherwise change the number in the URL to match.

8. Observe that your project shows up at this new URL.  That's where you'll access it from now on.

   ![triangle](docs/image-02.png)

Unfortunately, web developers in practice have to do that fake server thing pretty often to be able to work on their files locally. **Keep the .bat or .command program open while you work.**


### Step 3:  Continue the next steps to begin viewing the code.  

1. Although any text editor will work on our files, for this class you'll need to use the editor inside of Chrome, because of its debugging tools.  

2. Resume with the open Chrome window from the previous step 8.

   ![triangle code](docs/image-06.png)

3. Press F12 (Windows) or Cmd+Option+i (Mac) to open the Chrome developer tools panel (DevTools).

4. You want DevTools to be able to take up the whole screen.  Undock it from your web page window.  Do this by clicking the ellipsis at the upper right corner, and selecting the first choice under "Dock Side".

   ![triangle code 2](docs/image-07.png)

5. Maximize both your web page window and DevTools windows.  Use the keyboard shortcut Alt+tab (Windows) or Cmd+~ (Mac) to switch between them quickly.

6. Click the "Sources" tab of the DevTools panel, towards the top of the screen.

   ![menu bar](docs/image-08.png)

7. Without leaving the "Sources" outer tab, look at the navigator panel on the left.  This might be collapsed in the upper corner.  Regardless open the "Page" inner tab underneath it.

   ![navigator](docs/image-09.png)

8. You should see all the files you downloaded from GitHub here.  Click them open to make sure you can see the code.  Now you can read it all here.

   ![url bar](docs/image-10.png)

9. Press F1 to open settings, and choose "Default indentation: 2 spaces".  Close settings.
   * This is just so you won't be prevented from matching our formatting.

These steps, and the following ones, may seem like a lot of work but they are part of becoming a real web developer with a good workflow, as opposed to someone who just knows the language.  The biggest key of all to becoming a good developer is actually going be mastering the **debugger** feature, but first for this assignment let's just take it slow and set up our editor.


### Step 4:  Continue the next steps to begin modifying:

1. Change from the "Page" inner tab to the "Filesystem" inner tab, which might be collapsed behind the arrow.  This one should be empty.

   ![filesystem](docs/image-11.png)

2. Drag and drop your local file folder from your computer's folder navigator straight into the middle of the DevTools window.  If you can't figure out how to drag between maximized windows (you can), just use the manual "add folder to workspace" button and choose your folder.
Either way this will complete the mapping between your real local files and the fake ones over the network.

   ![copy](docs/image-12.png)

   * It's going to ask you for permission to modify your local files.  Hit yes.
   
     ![allow](docs/image-13.png)
   
   * If this doesn't happen as described, try to find help on setting your local folder as a workspace.

     ![url bar](docs/image-14.png)

3. Observe the little green dots next to each file in the "Filesystem" subtab.  These green dots verify that your Chrome has matched your fake server to your local files.

4. Sometimes a green dot is missing -- especially on index.html.   That is dangerous; the file is not mapped right and any changes you make to it will be lost.  When green dots are missing, hit ctrl+F5 (Windows) or cmd+F5 (Mac) to do a hard refresh.  This re-loads them from your local files and re-maps them again.

   ![reload](docs/image-15.png)

Be aware that for as long as you have DevTools open, back at browser window you have unlocked some new ways to refresh:  Right-click the refresh button to see them.

5. If the green dots still don't show up, delete what's in the workspace area and try again until they appear.

6. Now you can edit the files directly inside Chrome, in the DevTools "Sources" tab.
   * As long as you make changes under "Sources" and not "Elements", your changes will now persist in your own local files even after page refreshes.
   * You should avoid ever accidentally typing in the "Elements" tab.  That's only for temporary HTML stuff your code generates.

Editing directly in Chrome like this is the workflow we will use.  One reason is that your code immediately changes its behavior as you type.  Even when it's in the middle of running, or as soon as you un-pause it in the debugger.  Elements will move around on the page immediately when you make changes.  This allows you to you dynamically test new code without re-starting your whole animation and losing your place -- without having to wait for your timed scenes to progress to that point again -- or without having to enter the right inputs again.


### Step 5:  Continue the next steps to begin using Chrome as a code editor:

1. If you've never learned your way around an IDE for editing code, now is the time to.  Chrome's code editor is kind of in-between in terms of quality:  Better than Windows Notepad or TextEdit, but not quite as good as Notepad++ or Microsoft VSCode.  In order for it to be better than crudely opening your code in notepad, you need to know what basic features to expect from a text editor.  Let's learn them.

2. Find and try each of the following code editing commands once. They're found in that DevTools Sources tab.
   * Block indent / unindent (Tab and Shift+Tab)
   * Block comment / uncomment (Ctrl+/ or Cmd+/)
     ** For both of the above bullet points, try it on multiple highlighted lines at once.
   * Zoom in/out while reading
     ** Hold down Ctrl (Windows) or Cmd (Mac) and then press plus, minus, or zero to adjust.
     ** Use this fit a comfortable amount of code on-screen for you to read at once.
   * find (Ctrl+f or Cmd+f)
   * find-and-replace
   
     ![find and replace](docs/image-16.png)
     
     ** For both of the above bullet points, note that you don't have to find specific or exact strings; Chrome supports matching **regular expressions**, for finding all text of a more general pattern.  That's the .* button.


#### Step 6:  Continue the next steps to complete assignment 1:

1. With our animation running in Chrome, with DevTools still open to the Sources tab.  Open the file "main-scene.js".  This is under the "Filesystem" tab of the navigator panel, which might be collapsed in the upper corner.

   ![code](docs/image-17.png)

2. If there's no green dot next to  "main-scene.js", fix it as described above.

3. The code is divided up into JavaScript classes.  The one at the top of the file constructs the geometry of a triangle.  Let's edit it to become a square.

   ![code](docs/image-18.png)

4. On line 13, add the following three items to the JavaScript array, which is all the text enclosed by square brackets [ ].  Add a comma to separate from previous items in the array.
   * Vec.of(0,1,0), Vec.of(1,0,0), Vec.of(1,1,0)

5. On line 14, add the following three items to the JavaScript array:
   * Color.of(0,0,1,1), Color.of(0,1,0,1), Color.of(1,1,0,1)

6. Save the file, and reload the page (using Ctrl+Shift+r for Windows, Cmd+Shift+r for Mac).  Switch back to look at your web page window.  The triangle should be a square now, because you just attached a second triangle to it.  If so, your edit worked and your file is saved.  If not, check for green dots and fix it as per above.

   ![square](docs/image-19.png)

7. If you typed the wrong thing, you could get console errors, a blank web page, or missing triangles.  Later on we'll show you how to use the debugger and the console together to approach errors in a smart way.  For now, just type it right.

8. Your files should be ready to turn in now, including your trivial change.

9. Be looking for our supplement to this assignment, which explains how to start using everything you've set up as a code debugger.  That will be the whole point of using Chrome as our environment!

#### Step 7:  Continue the next steps to turn in assignment 1 on CCLE:

(10 points)

1.  Zip up all your files (except for the "docs" folder, please leave that out) in a single .zip file, which you will name after your student UID.  Turn in your .zip on CCLE, where we will add a place to do so.

#### Step 8 (Extra credit):  Continue the next steps to turn in assignment 1 on GitHub:

(10 bonus points)

1. This bonus step requires that you actually got GitHub Desktop (or just plain git) set up correctly to talk to your local files.  Do that.  Use the instructions provided by GitHub for setting up GitHub Desktop, and use Google for any help.

2. Important:  In order for us to notice that you did this, you must mark the files you turned in on CCLE in step 7.  Otherwise we will not know to check your GitHub.  So, if you do the extra credit, please leave an extra file called "github.txt" in the root of your .zip folder, and the contents of your text file should be your GitHub username.  Do this part exactly right, and include it in the turned in files on CCLE.  Then we will know to check your GitHub.

3. Once you have made the minor edit to your local files (from the steps above), all you have left to do is push them back to the GitHub repo you made in step 1.  This is easy using GitHub Desktop's interface.  Visit your repo page online (accessible from the GitHub Desktop menus) and check the file contents to verify that your edit is there.

In case you decide you want to use plain git instead on the command line, here are instructions for that too: https://pastebin.com/YQimN4Mn



