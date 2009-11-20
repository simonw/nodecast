var sys = require('sys'),
    http = require('http'),
    posix = require('posix'),
    repl = require('repl'),
    redis = require('./redis');

// Make visible to repl:
dj = require('./djangode');

var PORT = 8002;

var db = redis.create_client();
var REDIS_KEY = 'nodecast-queue';

messages = [];
message_queue = new process.EventEmitter();

addMessage = function(msg, callback) {
    db.llen(REDIS_KEY, function(i) {
        msg.id = i;
        db.rpush(REDIS_KEY, JSON.stringify(msg), function() {
            message_queue.emit('message', msg);
            callback(msg);
        });
    });
}

getMessagesSince = function(id, callback) {
    db.lrange(REDIS_KEY, id, 10000, function(items) {
        callback((items || []).map(JSON.parse));
    });
}

var submit_form = '<h1>Send a message</h1> \
<form action="/submit-message" method="post"> \
    <input type="text" id="t" name="text"> \
    <input type="submit"> \
</form><form action="/clear-messages"> \
    <p><input type="submit" value="Clear all messages"> \
</form><script>document.getElementById("t").focus();</script>';

var app = dj.makeApp([
    ['^/since$', function(req, res) {
        var id = req.uri.params.id || 0;
        getMessagesSince(id, function(messages) {
            dj.respond(res, JSON.stringify(messages), 'text/plain');
        });
    }],
    ['^/wait$', function(req, res) {
        var id = parseInt(req.uri.params.id || 0, 10);
        getMessagesSince(id, function(messages) {
            if (messages.length) {
                dj.respond(res, JSON.stringify(messages), 'text/plain');
            } else {
                // Wait for the next message
                var listener=message_queue.addListener('message', function() {
                    getMessagesSince(id, function(messages) {
                        dj.respond(res, 
                            JSON.stringify(messages), 'text/plain'
                        );
                        message_queue.removeListener('message', listener);
                        clearTimeout(timeout);
                    });
                });
                var timeout = setTimeout(function() {
                    message_queue.removeListener('message', listener);
                    dj.respond(res, JSON.stringify([]), 'text/plain');
                }, 10000);
            }
        });
    }],
    ['^/submit-message$', function(req, res) {
        dj.extractPost(req, function(params) {
            addMessage(params, function(msg) {
                s = submit_form + "Done! Message was assigned ID " + msg.id
                dj.respond(res, s);
            });
        });
    }],
    ['^/clear-messages$', function(req, res) {
        db.del(REDIS_KEY, function() {
            dj.redirect(res, '/message-form');
        });
    }],
    ['^/error$', function(req, res) {
        "bob"("not a function");
    }],
    ['^/favicon\.ico$', function(req, res) {
        dj.respond(res, '');
    }],
    ['^/message-form$', function(req, res) {
        dj.respond(res, submit_form);
    }],
    ['^/(.*)$', dj.serveFile] // catchall for other reqs
]);


server = http.createServer(app);
server.listen(PORT);

sys.puts("Server running at http://127.0.0.1:" + PORT + "/");
repl.start("dj.debuginfo > ");

