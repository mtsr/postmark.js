var request = require("request");
var async = require("async");

module.exports = (function (api_key, options) {
  if (typeof api_key == undefined)  {
    throw("You must provide your postmark API key");
  }
  if (typeof options === 'undefined')  { options = {}; }
  if (options.ssl && options.ssl !== true) { options.ssl = false; }

  return {
    send: function(message, callback) {
      
      var valid_parameters = ["From", "To", "Cc", "Bcc", "Subject", "Tag", "HtmlBody", "TextBody", "ReplyTo", "Headers", "Attachments"]
      var valid_attachment_parameters = ["Name", "Content", "ContentType"];
      var attr, attach;
      for (attr in message) {
        if (valid_parameters.indexOf(attr) < 0)  {
          throw("You can only provide attributes that work with the Postmark JSON message format. Details: http://developer.postmarkapp.com/developer-build.html#message-format");
        }
        if (attr == "Attachments") {
          for(attach in message[attr])  {
            var attach_attr;
            for (attach_attr in message[attr][attach])  {
              if (valid_attachment_parameters.indexOf(attach_attr) < 0)  {
                throw("You can only provide attributes for attachments that work with the Postmark JSON message format. Details: http://developer.postmarkapp.com/developer-build.html#attachments");
              }
            }
          }
        }
      }

      postmark_headers = {
        "Accept":  "application/json",
        "X-Postmark-Server-Token":  api_key
      };

      var port = options.ssl ? 443 : 80;
      var opts = {
          method: "POST",
          uri: "http://api.postmarkapp.com:" + port + "/email",
          headers: postmark_headers,
          json: true,
          body: message
      };
      
      request(opts, function (err, res, body) {
        if (err) { return callback(err); }
        if (res.statusCode != 200) {
            return callback({
                status: res.statusCode,
                errorCode: body["ErrorCode"],
                message: body["Message"]
            });
        }
        return callback(null, body);
      });
    },
      
    retrieveBounces: function(filters, callback) {
        var filterArray = [];
        for (var key in filters) {
            filterArray.push(key+"="+filters[key]+"&");
        }

        postmark_headers = {
            "Accept":  "application/json",
            "X-Postmark-Server-Token":  api_key
        };

        var port = options.ssl ? 443 : 80;
        var uri = "http://api.postmarkapp.com:" + port + "/bounces?" + filterArray.join("&");
        var opts = {
            method: "GET",
            uri: uri,
            headers: postmark_headers,
            json: true
        };
        request(opts, function(err, res, body) {
            if (err) { return callback(err); }
            if (res.statusCode != 200) {
                return callback({
                    status: res.statusCode,
                    errorCode: body["ErrorCode"],
                    message: body["Message"]
                });
            }
            console.log(body);
            return callback(null, body);
        });
    },

    retrieveBounceByBounceID: function(bounceID, callback) {
        postmark_headers = {
            "Accept":  "application/json",
            "X-Postmark-Server-Token":  api_key
        };

        var port = options.ssl ? 443 : 80;
        var uri = "http://api.postmarkapp.com:" + port + "/bounces/" + bounceID;
        var opts = {
            method: "GET",
            uri: uri,
            headers: postmark_headers,
            json: true
        };
        request(opts, function(err, res, body) {
            if (err) { return callback(err); }
            if (res.statusCode != 200) {
                return callback({
                    status: res.statusCode,
                    errorCode: body["ErrorCode"],
                    message: body["Message"]
                });
            }
            console.log(body);
            return callback(null, body);
        });
    },

    retrieveBounceByMessageID: function(messageID, callback) {
        var self = this;
        async.waterfall([
            function(waterfallCallback) { self.retrieveBounces({
                messageID: messageID
            }, waterfallCallback); },
            function(bounces, waterfallCallback) {
                if (bounces.TotalCount < 1) {
                    return waterfallCallback(null, null);
                }
                self.retrieveBounceByBounceID(bounces[0].id, waterfallCallback);
            }
        ], callback);
    }
  }
});
