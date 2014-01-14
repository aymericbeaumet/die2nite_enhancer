/**
 * Generic JavaScript helpers
 */

var js = (function() {

/*
  public:
*/

    /**
     * Execute an asynchronous network request.
     * @param string method
     * @param string url
     * @param string data
     * @param JSON headers
     * @param callback onsuccess in case of success
     * @param callback onfailure in case of failure
     * @param Object param An object given as an additional parameter to callbacks
     */
    function network_request(method, url, data, headers, onsuccess, onfailure, param) {

        // Google Chrome script / GreaseMonkey
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            return GM_xmlhttpRequest({
                method: method,
                url: url,
                data: data,
                headers: headers,
                onload: function(r) { onsuccess(r.responseText, param); },
                onerror: function(r) { onfailure(param); }
            });
        }

        // Safari needs to dispatch the request to the global page
        if (typeof safari !== 'undefined') {
            safari.addEventListener('message', function(event) {
                switch (event.name) {
                    case 'network_request_succeed':
                        return onsuccess(event.message, param);

                    case 'network_request_failed':
                        return onfailure(param);
                }
            }, false);

            return safari.tab.dispatchMessage('do_network_request', {
                method: method,
                url: url,
                data: data,
                headers: headers
            });
        }

        // All other cases
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open(method, url, true);
        for (var header in headers) {
            xmlhttp.setRequestHeader(header, headers[header]);
        }
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState === 4) {
                if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                    return onsuccess(xmlhttp.responseText, param);
                }
                return onfailure(param);
            }
        };
        xmlhttp.send(data);
    }

    /**
     * Check if a given variable is defined and is not null.
     * @param mixed variable The variable to check
     * @return bool true if the variable is defined and is not null, otherwise
     * false
     */
    function is_defined(variable)
    {
        return (typeof variable !== 'undefined' && variable !== null);
    }

    /**
     * Catch a keydown event (abort if the cursor is in an input field). Call
     * the callback `callback` with the current keycode and the last one (if it
     * exists).
     * @param callback callback The function to call, should look like the
     * following prototype: `function(keycode, previous_keycode){};`.
     * previous_keycode will be null if it doesn't exists.
     * @param integer time_limit The maximum amount of time (in ms) to wait
     * between two binds.
     */
    function keydown_event(callback, time_limit)
    {
        // defaut 1000ms between two key strokes
        time_limit = (is_defined(time_limit)) ? time_limit : 1000;

        document.addEventListener('keydown', function(event) {
            // Cancel event if the cursor is in an input field or textarea
            if (event.target.nodeName === 'INPUT' || event.target.nodeName === 'TEXTAREA') {
                return;
            }

            // Cancel event if elapsed time is too long between two key strokes
            if (event.timeStamp - _keydown_event.previous_keycode_timestamp > time_limit) {
                _keydown_event.previous_keycode = null;
            }

            // Invoke callback
            callback(event.keyCode, _keydown_event.previous_keycode);

            // Save keycode
            _keydown_event.previous_keycode = event.keyCode;
            _keydown_event.previous_keycode_timestamp = event.timeStamp;
        }, false);
    }
    var _keydown_event = {
        previous_keycode: 0,
        previous_keycode_timestamp: 0,
    };

    /**
     * Inject CSS code in the page context.
     * @param string code The CSS code to inject
     */
    function injectCSS(code)
    {
        var css = document.createElement('style');
        css.setAttribute('type', 'text/css');
        css.textContent = code;

        wait_for_selector('html > head', function(node) {
            node.appendChild(css);
        });
    }

    /**
     * Inject and execute JavaScript code in the page context.
     * @link http://wiki.greasespot.net/Content_Script_Injection
     * @param string/callback source The JS code to inject
     */
    function injectJS(source)
    {
        // Check for function input.
        if ('function' === typeof source) {
            // Execute this function with no arguments, by adding parentheses.
            // One set around the function, required for valid syntax, and a
            // second empty set calls the surrounded function.
            source = '(' + source + ')();'
        }

        // Create a script node holding this  source code.
        var script = document.createElement('script');
        script.setAttribute('type', 'application/javascript');
        script.textContent = source;

        // Insert the script node into the page, so it will run, and immediately
        // remove it to clean up.
        wait_for_selector('html > body', function(node) {
            node.appendChild(script);
            node.removeChild(script);
        });
    }

    /**
     * Remove an DOM node.
     * @link http://stackoverflow.com/a/14782/1071486
     * @param DOMNode node The DOM node to delete
     */
    function remove_DOM_node(node)
    {
        if (is_defined(node)) {
            node.parentNode.removeChild(node);
        }
    }

    /*
     * Recursively merge properties of n objects. The first object properties
     * will be erased by the following one's.
     * @link http://stackoverflow.com/a/8625261/1071486
     * @param object... Some objects to merge.
     * @return object A new merged object
     */
    function merge()
    {
        var obj = {};
        var il = arguments.length;
        var key;

        if (il === 0) {
            return obj;
        }
        for (var i = 0; i < il; ++i) {
            for (key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    obj[key] = arguments[i][key];
                }
            }
        }

        return obj;
    }

    /**
     * Execute a callback when a node with the given $id is found.
     * @param string id The id to search
     * @param callback callback The function to call when a result is found
     */
    function wait_for_id(id, callback)
    {
        var el;

        if (js.is_defined(el = document.getElementById(id))) {
            return callback(el);
        }
        setTimeout(function() {
            wait_for_id(id, callback);
        }, 50);
    }

    /**
     * Redirect to the given url.
     * @param string url The url to redirect to
     */
    function redirect(url)
    {
        window.location.href = url;
    }

    /**
     * Reload the current page.
     */
    function reload()
    {
        location.reload();
    }

    /**
     * Instanciate a Regex object and test to see if the given string matches
     * it.
     * @param string The string to test
     * @param string/RegExp The regex to match the string with
     * @return bool true if the regex matches the string, false otherwise
     */
    function match_regex(string, regex)
    {
        var r;

        if (regex instanceof RegExp) {
            r = regex;
        } else {
            r = new RegExp(regex);
        }

        return r.test(string);
    }

    /**
     * Execute a callback with the first node matching the given selector.
     * @param string selector The selector to execute
     * @param callback callback The function to call when a result is found
     */
    function wait_for_selector(selector, callback)
    {
        var el;

        if (js.is_defined(el = document.querySelector(selector))) {
            return callback(el);
        }
        setTimeout(function() {
            wait_for_selector(selector, callback);
        }, 50);
    }

    /**
     * Execute a callback with an array containing all the nodes matching the
     * given selector.
     * @param string selector The selector to execute
     * @param callback callback The function to call when a result is found
     */
    function wait_for_selector_all(selector, callback)
    {
        var el;

        if (js.is_defined(el = document.querySelectorAll(selector))) {
            return callback(el);
        }
        setTimeout(function() {
            wait_for_selector_all(selector, callback);
        }, 50);
    }

    /**
     * Safely insert code through JSON.
     * @link https://developer.mozilla.org/en-US/Add-ons/Overlay_Extensions/XUL_School/DOM_Building_and_HTML_Insertion
     */
    jsonToDOM.namespaces = {
        html: "http://www.w3.org/1999/xhtml",
        xul: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
    };
    jsonToDOM.defaultNamespace = jsonToDOM.namespaces.html;
    function jsonToDOM(xml, doc, nodes)
    {
        function namespace(name) {
            var m = /^(?:(.*):)?(.*)$/.exec(name);
            return [jsonToDOM.namespaces[m[1]], m[2]];
        }

        function tag(name, attr) {
            if (Array.isArray(name)) {
                var frag = doc.createDocumentFragment();
                Array.forEach(arguments, function (arg) {
                    if (!Array.isArray(arg[0]))
                        frag.appendChild(tag.apply(null, arg));
                    else
                        arg.forEach(function (arg) {
                            frag.appendChild(tag.apply(null, arg));
                        });
                });
                return frag;
            }

            var args = Array.prototype.slice.call(arguments, 2);
            var vals = namespace(name);
            var elem = doc.createElementNS(vals[0] || jsonToDOM.defaultNamespace,
                                           vals[1]);

            for (var key in attr) {
                var val = attr[key];
                if (nodes && key == "key")
                    nodes[val] = elem;

                vals = namespace(key);
                if (typeof val == "function")
                    elem.addEventListener(key.replace(/^on/, ""), val, false);
                else
                    elem.setAttributeNS(vals[0] || "", vals[1], val);
            }
            args.forEach(function(e) {
                elem.appendChild(typeof e == "object" ? tag.apply(null, e) :
                                 e instanceof Node    ? e : doc.createTextNode(e));
            });
            return elem;
        }
        return tag.apply(null, xml);
    }

/*
*/

    return {
        network_request: network_request,
        is_defined: is_defined,
        keydown_event: keydown_event,
        injectCSS: injectCSS,
        injectJS: injectJS,
        remove_DOM_node: remove_DOM_node,
        merge: merge,
        wait_for_id: wait_for_id,
        redirect: redirect,
        reload: reload,
        match_regex: match_regex,
        wait_for_selector: wait_for_selector,
        wait_for_selector_all: wait_for_selector_all,
        jsonToDOM: jsonToDOM
    };

})();