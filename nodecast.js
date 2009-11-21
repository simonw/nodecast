var sys = require('sys'),
    http = require('http'),
    posix = require('posix'),
    repl = require('repl'),
    dj = require('./djangode')
;

var PORT = 8006;

messages = [];
message_queue = new process.EventEmitter();

addMessage = function(msg) {
    msg.id = messages.length;
    messages.push(msg);
    message_queue.emit('message', msg);
}

getMessagesSince = function(id) {
    return messages.slice(id);
}

var submit_form = '<form action="/submit-message" method="post"> \
    <input type="text" id="t" name="text"> \
    <input type="submit"> \
</form><script>document.getElementById("t").focus();</script>';

var app = dj.makeApp([
    ['^/message-form$', function(req, res) {
        dj.respond(res, submit_form);
    }],
    ['^/submit-message$', function(req, res) {
        dj.extractPost(req, function(params) {
            addMessage(params);
            s = submit_form + "Done! Message was assigned ID " + params.id
            dj.respond(res, s);
        });
    }],
    ['^/wait$', function(req, res) {
        var id = req.uri.params.id || 0;
        var messages = getMessagesSince(id);
        if (messages.length) {
            dj.respond(res, JSON.stringify(messages), 'text/plain');
        } else {
            // Wait for the next message
            var listener = message_queue.addListener('message', function() {
                dj.respond(res, 
                    JSON.stringify(getMessagesSince(id)), 'text/plain'
                );
                message_queue.removeListener('message', listener);
                clearTimeout(timeout);
            });
            var timeout = setTimeout(function() {
                message_queue.removeListener('message', listener);
                dj.respond(res, JSON.stringify([]), 'text/plain');
            }, 10000);
        }
    }],
    ['^/$', function(req, res) {
        dj.serveFile(req, res, 'index.html');
    }],
    ['^/jquery\.js$', function(req, res) {
        dj.serveFile(req, res, 'jquery-1.3.2.js');
    }]
]);

server = http.createServer(app);
server.listen(PORT);

sys.puts("Server running at http://127.0.0.1:" + PORT + "/");
repl.start("> ");
