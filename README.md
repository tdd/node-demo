node-demo(1) -- An all-around NodeJS demo for tech·days 2014
============================================================

Synopsis
--------

An online quiz system with realtime sync between the quiz server and connected clients (desktops, laptops, tablets, smartphones…) and an optional hardware interface.

This is a wide-angle demo of Node.js capabilities, well-known modules, best practices, code patterns, etc.  It was intended as the support of my Node.js talks at various conferences including BLEND, France.JS and tech·days.  I also use it during my training classes for quiz running, because eh, it just works!

**Note:** this README doubles as a **man page** for the executable wrapper script thanks to the `marked-man` module.  This explains a few syntactical/structural choices about its content.


Installation
------------

If you are entirely new to Node.js, it is quite likely you will need to setup a number of things to be able to run this demo.  While the entire set of module dependencies is installable automatically, core technical layers need to be there already.

Also, we rely on two distinct authentication schemes for demo purposes, one of which will require you to register a new app of your own (this doesn't require any coding) with your Twitter account.

This demo intentionally taps into a number of supporting technologies:

* Node 0.10+ (obviously)
* SQLite 3 (for long-term storage and traditional ORM demo'ing)
* Redis (for NoSQL storage and fault tolerance / crash recovery)
* Arduino (optional; for hardware interfacing)

If you are running OSX, the best way to install all this (except for Arduino stuff) is probably through the excellent [Homebrew](http://brew.sh/) system.  If you don't have it yet, follow setup instructions on its website, then just do this:

```
brew install node sqlite redis
```

If you don't have immediate write rights on `/usr/local`, you'll need to prefix that command with `sudo`.

On Linux/Unix distros, your can either your favorite package manager if its managed versions are recent enough, use binary installers provided by each software (Node has one, for instance), or install from source.

On Windows, individually provided installers are probably your best bet.

Once this is done, grab this code (either through Git cloning or by downloading and extracting a [Zip](https://github.com/tdd/node-demo/archive/master.zip) or [tarball](https://github.com/tdd/node-demo/archive/master.tar.gz)) and get into its root directory.

Start by installing all local dependencies:

```
npm install
```

This will take some time (as this is a showcase project, there are a lot of dependencies, and their own dependencies, etc.) and probably attempt to compile a few extension modules natively (failing to do that just means it'll resort to full-JS implementation, no worries).  The resulting module tree will be in the `node_modules` subdirectory.

Running the system relies not just on `node` but on `nodemon`, a small tool by Remy Sharp that is basically `node` restarting itself whenever you make changes to your codebase, to save you the trouble of restarting by hand.  Great for dev.  But you need to install it globally to be able to use it:

```
npm install -g nodemon
```

This will, perhaps, require `sudo`, as always.

The next step is about transpiling, concatenating and source-mapping resources intended for use in the browser by the UIs (backoffice and frontoffice) of the system.  This is achieved through the Brunch tool, another awesome tool.  You'll need to install it globally…

```
npm install -g brunch
```

…perhaps within a `sudo` command if your rights are insufficient.  Then, again from the app's root directory, just go:

```
brunch build
```

The resulting tree will be in the `public` subdirectory.

You can also use `npm run front` instead, which will also work if you installed Brunch locally instead of globally (as `npm run` automatically prefixes your `PATH` with `./node_modules/.bin`, where local packages alias their executable wrappers).

The final setup step is about **credentials**.  For obvious reasons, we did not put any credentials under version control, so you don't get any to start with.  See the **Credentials** section of this documentation for details on how to set these up.

When you're all set with credentials, start the system with `npm start`.  Once it is done outputting stuff, you should be able to access the backoffice at `http://localhost:3000/admin` and the frontoffice at `http://X.Y.Z.T:3000/` (where X.Y.Z.T is the IP address displayed next to the title in your backoffice).  The latter will ask you to authenticate on Twitter to obtain a name and avatar picture for your player profile.

You can stop the system simply by hitting Ctrl+C in its terminal.  Windows will ask for confirmation then superbly ignore you should you say no and still kill it.  Using Ctrl+C here is *not* ugly: the system detects the kill request and shuts down gracefully.

Command-Line Usage
------------------

Later on, should you wish to use this demo as a general command-line tool, you can install it globally (`npm install -g` from the app's directory), which will do three things:

1. Re-install this package and all dependencies in your global Node modules directory.
2. Link a `node-demo` binary in your global Node binaries directory (generally a directory that is in your existing PATH, but check out the install output to see what is actually is), so you can invoke that command from anywhere.
3. Install a man-compatible version of this README as the man page for the `node-demo` command.  So if you wish to see this whole thing again in man format, after global install you can just type:

```
man node-demo
```

The CLI wrapper for this tool, `node-demo`, accepts a couple options:

* `-i`, `--auto-init` *QUIZ_ID*
  Auto-inits an existing quiz based on its database ID.

* `-h`, `--help`
  Displays usage.


Want to Learn Node?
-------------------

As well you should!

There are a number of great resources for getting on with Node.js.  Some may become a bit outdated, but they are good nonetheless.

A great way to get started is through "Workshopper" tools.  These are Node modules you install globally that provide you with a command-line call guiding you step-by-step through increasingly complex exercises.  Here are a few that I really liked:

* [**The Art of Node**](https://github.com/maxogden/art-of-node) is a great starting resource by Max Ogden that compiles a number of useful info and links.
* [**Learn You A Node For Much Win!**](https://github.com/rvagg/learnyounode) starts at zero and covers the very essentials of Node.
* [**Stream Adventure**](https://github.com/substack/stream-adventure) and [**Stream Handbook**](https://github.com/substack/stream-handbook) help you dive deep into streams, that are the absolute core feature (and killer feature!) of Node.  Absolutely must-do.
* [**NodeSchool.io**](http://nodeschool.io) provides a number of « workshoppers », including Stream Adventure alongside many others helping you learn about and practice topics such as Async.js, promises, LevelDB, and more!

This aside, there are, of course, great starting resources in a more traditional, written form.

* [**Node Beginner Book**](http://www.nodebeginner.org/)
* [**How To Node**](http://howtonode.org/) is a compiled set of resources, best practices and useful solutions.

The [official API pages](http://nodejs.org/api/) for Node are also a great resource, not just reference manual but actually full of descriptive, discover-that-module text.  Node provides about two dozen **Core Modules** that already provide a truckload of functionality and you should absolutely get to know these.

Finally, Geoffrey Rosenbach, of Peepcode fame, put together a great [**2-hour screencast**](https://peepcode.com/screencasts/node) that is a great way to cover extra ground and build a neat full app with Node.  It is commercial (you have to pay for it), but cheap, and as all Peepcode material, it's great quality and great value.

Also, remember that Node, because it runs on the V8 JavaScript engine, fully supports ES5, the latest finalized version of JavaScript.  There is a lot of power in ES5 that you're not used to when programming for browsers and needing to support IE8 or below, so you should get familiar with its new goodies, especially all the new methods on `Array` and `Object`, not to mention `Function#bind`.

Do you train people on Node?
----------------------------

Absolutely.  My company, [Delicious Insights](http://delicious-insights.com/), does a lot of JS training, including Node.  While all of our multi-company, pre-scheduled training sessions happen in Paris and in French, we can completely cater in English to your in-house needs anywhere in Europe, or anywhere in the world if you're game for it!

We're currently setting up our public Node training pages and will link to them from this README when they're available.  In the meantime, feel free to contact me using the address at the bottom of this page or in the app’s `package.json` file.

Credentials
-----------

We mentioned before that this demo app needs two sets of credentials to work, one for the backoffice (admin pages) and one for the frontoffice (players-facing UI).

The backoffice is the simpler one: it's just a random username and password of your choice, put in a `credentials.json` file in the `app/back` subdirectory.  You could go with this for instance:

```
{
  "user": "moi",
  "password": "secret"
}
```

Save it, restart the app, verify in the log that it could read the back credentials, then try accessing `http://localhost:3000/admin`.  Your browser should ask you for authentication through a dialog box, and typing your credentials should take you to the main backoffice page (quiz listing; none to start with).

The players-facing UI (the `front` sub-app) requires more setup work from your part as it relies on Twitter OAuth and therefore needs your app to provide Twitter credentials for what they call a *Twitter Application*.

So you need to register such an app yourself to get these app-identifying credentials and complete setup.  The good news is, this will make for a more customized, your-very-own demo experience!

1. Go to the [Twitter Developers Page](https://dev.twitter.com/)
2. Sign in with your Twitter account
3. In your top-right avatar menu, go to [My Applications](https://dev.twitter.com/apps)
4. Click [Create a new application](https://dev.twitter.com/apps/new)
5. Give it a name, description (10+ characters), website (your personal website, blog or Twitter page, whatever), ignore the callback URL, agree to the Terms of Service, type the CAPTCHA and click Create your Twitter application.
6. You will get to your app's Details page, with the automatically-generated consumer key and secret.  Your app, by default, is read-only, which is just fine for our demo.

Create a `credentials.json` file in the `app/front` subdirectory.  It should have the following structure:

```
{
  "consumerKey": "PUT_YOUR_APP_CONSUMER_KEY_HERE",
  "consumerSecret": "PUT_YOUR_APP_CONSUMER_SECRET_HERE"
}
```

There!  You're done!  Restart the app (you could just type `rs` and hit Return in your running app's `nodemon` terminal, or hit Ctrl+C and run it again), make sure that the logs tell you front credentials were logged, and try accessing `http://X.Y.Z.T:3000` (where X.Y.Z.T is the IP address displayed in your backoffice, next to the title).  You should first get redirected to Twitter for authentication, displaying your very own app's name, icon and description.  Login if necessary, then click “Authorize app”: you should get to the "No active quiz yet" page.

The system persists your Twitter user for the URL you're using and your current accessing IP in Redis, so you don't have to re-auth all the time.

Congratulations, you went through all the credentials setup, you're all set to go and play!


WTF Arduino?
------------

What, you don't know Arduino yet?  Tsk tsk tsk.

Arduino is an Italian maker of cool microcontrollers.  A microcontroller is a small electric circuit that lets you connect to it through, say, a USB cable or Wi-Fi connection, then you can dump a program of yours in it and quite easily tinker with its inputs and outputs.  This is a great way to dabble in electronics and have your programs control hardware stuff.

Such microcontrollers are quite the rage these days, the most popular boards seem to be the Arduino Uno, Raspberry Pi and stuff by Tinkerkit.  Recently, the Tessel boards and modules are making an entrance.

What's even cooler is that we can control most of that stuff using JavaScript, thanks to three layers of technology:

1. [node-serialport](https://github.com/voodootikigod/node-serialport) lets us read and write anything on serial and USB ports from JavaScript.
2. [Firmata](http://firmata.org/wiki/Main_Page) is sort of a standard protocol for communicating with microcontrollers.  You can dump a Firmata runtime on your board, and use a [Firmata library](https://github.com/jgautier/firmata) on your programming side to talk with it.
3. [Johnny-Five](https://github.com/rwaldron/johnny-five) is a higher-level library that provides ready-made JavaScript constructors modeling a lot of traditional electronic parts (LEDs, LCD displays, sliders, claws, joysticks, motors and servos, shiftregisters, sonars, IR sensors, etc.), and of course the board itself (e.g. your Arduino board).

Johnny-Five makes it trivial for us to interact with an Arduino board *via* JavaScript.  Just look at the `app/arduino.js` module if you don't believe me.

If you're interested in discovering the joys of hardware/robotics programming with Arduino yourself, here are a few great resources:

* [The official Arduino site](http://arduino.cc/) contains a truckload of info, the API reference and lots of learning materials (examples plus the famous Arduino Playground), and you can download the [Arduino IDE](http://arduino.cc/en/Main/Software#toc1) to play with every feature of the board and its API.
* You can buy Arduino boards, electronic parts and various put-together things (like a breadboard and wires) at many online stores.  Most offer [starter kits](http://snootlab.com/lang-en/snootlab-shields/90-snootlab-starter-kit-en.html) that are a great place to start with.  In the US people seem to like [Sparkfun](https://www.sparkfun.com/) a lot, in France I'm partial to [Snootlab](http://snootlab.com/lang-en/6-arduino).
* [The Adafruit Learning System](http://learn.adafruit.com/category/learn-arduino) is an absolutely amazing learning resource for anything related to microcontrollers and do-it-yourself electronics.

When you're ready to put together the board used by this demo's Arduino module, [the diagram is here](https://raw.github.com/tdd/node-demo/master/docs/node-demo-arduino.png).


Videos
------

The video of the first session I held at BLEND isn't up yet, but [the one at FranceJS is available](http://2013.capitoledulibre.org/conferences/francejs/tour-dhorizon-de-nodejs.html).  I'll link to the tech·days one when it's up, which should happen soon.

To-Do
-----

* Unit tests of parts of the engine with Mocha
* Integration tests of the whole stack with Mocha + CasperJS
* Travis integration

Watch the Github repo for updates!

Reporting Bugs
--------------

Use the [node-demo issues page](https://github.com/tdd/node-demo/issues) on Github.


Author
------

[Christophe Porteneuve](mailto:christophe@delicious-insights.com)
