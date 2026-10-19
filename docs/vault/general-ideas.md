# general-ideas

**In short:** the owner's raw brainstorm — pomodoro timer, planning/review modes,
task carry-over, customization, heatmaps — kept as-is. Distilled into [[Roadmap]]
and [[Visibility-moc]].

> Raw ramble, kept as-is. Formalized in [[Roadmap]] (every idea mapped there) and [[Visibility-moc]].

### Obsious improvements:

- the progress bar of everyone should only be round at the end or start not on the transition between two states
- I should be able to edit and delete Tasks
- I will need a feature for a common pomodoro timer

Glossary: action panel is the main view I have rn where I see all people
so the main idea is there is like three modes in a way a planning a reviewing and a doing right doing is like being in the moment

- Navigation
-     - Action | Plan | Review / Statistics mode

#### Customization

at so point I guess it would be good if people can set a custom background and theme and so on as I know that customizing motivates people

### things that I just know work

for reference I already built something like this with the same real users and some things I already know works well with them

I know they get motivated when the leader board is not just daily but weekly and monthly but I just need to find the right way to display the data and find the right data to display I guess cause I know I can take it further than that
I useed to display heatmaps about what they did and I know they loved it
eventually I will probably have to expand the type of activities to not just study but also other activities as that's how it used to be not sure how and when

## Task Panel

- Quick view of past tasks?
- as of right now I am only showing tasks for the day but obviously I will need toyou expand this but I need to think like how do people keep an overview of what they do without getting overwhelmed and one thing I usually do that I think could work you
- Yes, so I'm thinking when I think of logseq, the competitor of Obsidian. There is something that I really like which is like an infinite scroll of past notes and it kind of clicks with my brain because that's kind of how I do it manually too like I don't like to just hoard tasks I write them down in the notebook and then usually I start the day like going into the past pages and whatever I still need I carry over to today's day or I carry over to like the monthly tasks and whatever I don't need like I just let it kind of rub there basically right so the folk would be like kind of scrolling back and pulling stuff to today's day or pulling stuff to somewhere to look at it later so you start the day by looking at the past and looking at that plan week or month for whatever is in there and just create new tasks I guess something like that I guess it needs to be like intuitive but I don't know if I can fit that into the focus you want to feel like that should be more like part of the planning UI I guess

And when I think of moving tasks like to the future, like maybe you can set tasks for not just today but for tomorrow. One thing I really like is the kanban view of the Sunsama Task manager where like every day represents a column and then you just drag tasks around in the column. So I guess today's day would be like a column and then there would be like tomorrow and then I second infinite sites well kind of thing. But I don't know if I can make all of these concepts work or make them work together. Like I'm not really sure yet.

I also really like the hate calendar and how intuitive it feels. Some concepts that I kind of vibe with is that the scroll is like a size scroll instead of vertical school for most calendars. And that they kind of hide the night view because its like eight hours. We probably dont really do anything but then you can still expand it if you want. if you want, that was kind of nice.

## Sessions

### Session Planning

- and planned sessions should probably become a thing where for example I can drag a task into that timeline and that creates like a planned session and then I can drag more tasks in there and then somewhere I should have a very prominent visuial of what I planned for this session and then get like a retrospective of the session if Im making sense and the thing is it should be like this session → today → this week| another time (haven't figured that out yet) I'd like to take some good inspiration from sunsama in this regard

- Yes, so sessions and I really have to iterate on that because I feel like if my application was bodied and sessions would be like the heart of the application, the very core thing that I, it's like the mechanic that I really want to get right. And so on that side I kind of have a feeling that I should probably start working on until it like feels really smooth, right?So what I'm thinking about sessions is like when you're in the focused mode, you should really get a feeling that you are in a session with preferably with other people, but just generally this is part of the session. And I think some people do a pretty good job at it, for example fiveable And I need to still figure out the soul of this, like what makes it feel like you're having a session with other people. My intuition is telling me that a big part of that is the common timers, so that needs to be like a core feature that I want to implement.And then when you think of like your tasks on your day, there is like of course there's a grand scheme of things and planning mode and you know there is like today, yeah sure, but then there is also the session, right? So it's like tasks go from wherever they come from to today, from today, they kind of go into the session, right? And so you have the session which is like a block of hours where you and some friends dedicate to sitting down and getting stuff done and you and your friends, you'll have like your own task list And that's where I think five of all, that's a pretty good job because seeing with your friends with tasks and work on them, it does make you feel like you're in a session together but it's like there's something missing right? visually or whatever, it's not just the common timeliness, it's not just the task list, it's like I think we first of all visually those lines they need to probably more distinctively look like sessions right? and then I feel like when you hover over them like we did a good start with showing the yellow lines when tasks are done or when you hover over it maybe there should be something showing some stats about your session and and like the tasks that you planned for that session and the tasks that you actually managed to do within that session and how long that session took and whatnot And as I said, there really needs to be a way to feel like, okay, I'm in the session and whatever I'm doing during this chunk of times, like part of the session. So I'm not sure, like, maybe you should be able to drag things in and out of between session and table. Like, as I said, like, it needs to be intuitive. I really don't want to unnecessarily over-complicate things, right? And then when you think of a session of a block in time, that's like, there is the dedication and advance to sit down that block and do other kind of implies that sessions need to not only be like a footprint in time, something you record, but also something that perhaps you can plan ahead. Now the way I'm kind of envisioning this is Like this is just an early thought prototype, but I feel like there should be like a timeline of your day, right? And it's probably visible in a default dash for a planning model or whatever. Not sure about that yet. And then you should probably be able to just like drag a block into that timeline like you would do with the calendar, and then that would create a planned session. And another way to create a planned session would be to just like drag a task from your task list into that timeline. And so it's like, I plan to do this thing during this block of time, this session. And then you can just you know, grab more tasks in and out of that session. And then I guess they should still be visible as like your daily task list. But visually they should be recognized if it was like, hey, you assigned this task as part of this session. And then maybe when you plan a session, its like others can kind of like join your session. And then you like kind of dedicate to doing this session together. And you get like punished for rewards for actually sticking to that planned time and being on time or whatever. But I havent really figured out the points and reward system yet.

And that brings me to the dashboard right now which I guess is going to be coming back to focus view. I'm really not too convinced of the drive now. I'm pretty much open to you know putting it all upside down like what narrows is that it kind of gives to and makes you focus. And so in the center right now you see like the list which like the leaderboard list or whatever which is like it's good but I feel like more prominent top center should be like kind of a vision of your current session I'm not sure yet like I need to figure out what items make sense where and how to navigate between views and all that
