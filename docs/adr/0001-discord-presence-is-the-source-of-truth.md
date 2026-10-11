# Discord presence is the source of truth for study time

A member may track study manually from the dashboard, but only while Discord
shows no voice presence. The moment a voice event arrives, the manual partial
closes and the same session continues in the Discord mode. Manual tracking is a
fallback for time spent off Discord, never a parallel source.

The reason is trust: a manual start is a self-report, while a voice state is an
observation made by Discord. Letting both run at once would double-count the
same minutes and set two sources fighting over the same session. Continuing the
same session (rather than ending it) matches how every other in-session mode
change already works.
