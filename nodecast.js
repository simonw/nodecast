var sys = require('sys'),
    http = require('http'),
    repl = require('repl');

var PORT = 8001;

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

function respond(res, body, content_type, status) {
    content_type = content_type || 'text/html';
    res.sendHeader(status || 200, {
        'Content-Type': content_type  + '; charset=utf-8'
    });
    res.sendBody(body);
    res.finish();
}
function extractPost(req, callback) {
    req.setBodyEncoding('utf-8');
    var body = '';
    req.addListener('body', function(chunk) {
        body += chunk;
    });
    req.addListener('complete', function() {
        callback(http.parseUri('http://fake/?' + body).params);
    });
}

var paths = {
    '/since': function(req, res) {
        var id = req.uri.params.id || 0;
        respond(res, JSON.stringify(getMessagesSince(id)), 'text/plain');
    },
    '/wait': function(req, res) {
        var id = req.uri.params.id || 0;
        var messages = getMessagesSince(id);
        if (messages.length) {
            respond(res, JSON.stringify(messages), 'text/plain');
        } else {
            // Wait for the next message
            var listener = message_queue.addListener('message', function() {
                respond(res, 
                    JSON.stringify(getMessagesSince(id)), 'text/plain'
                );
                message_queue.removeListener('message', listener);
                clearTimeout(timeout);
            });
            var timeout = setTimeout(function() {
                sys.puts("Request for ID " + id + " timed out");
                message_queue.removeListener('message', listener);
                respond(res, JSON.stringify([]), 'text/plain');
            }, 10000);
        }
    },
    '/submit-message': function(req, res) {
        extractPost(req, function(params) {
            addMessage(params);
            respond(res, "Done! Message was assigned ID " + params.id);
        });
    },
    '/error': function(req, res) {
        "bob"("not a function");
    },
    '/message-form': function(req, res) {
        respond(res,
        '<form action="/submit-message" method="post"> \
            <input type="text" name="text"> \
            <input type="submit"> \
        </form>');
    }
}

function show_404(req, res) {
    respond(res,
        '<h1>404</h1>', 'text/html', 404
    );
}

function show_500(req, res, e) {
    var msg = ''
    if ('stack' in e) {
        msg = (
            '<p><strong>' + e.type + '</strong></p><pre>' + 
            e.stack + '</pre>'
        );
    } else {
        msg = JSON.stringify(e, 0, 2);
    }
    respond(res, '<h1>500</h1>' + msg, 'text/html', 500);
}

last_e = null;
last_request = null;
last_response = null;
server = http.createServer(function(req, res) {
    last_request = req;
    last_response = res;
    try {
        (paths[req.uri.path] || show_404)(req, res);
    } catch (e) {
        last_e = e;
        show_500(req, res, e);
    }
});
server.listen(PORT);

sys.puts("Server running at http://127.0.0.1:" + PORT + "/");
repl.start("last_request has last request> ");
