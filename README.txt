Basic design:

1. A simple array of messages (each has ID, datestamp, text)
2. A URL to get "every message since X"
3. A URL to "hang and wait for new message, last I saw was X"
4. An interface for posting new messages to the queue

The version presented at Full Frontal can be found in the 
no-redis branch:

http://github.com/simonw/nodecast/tree/no-redis

