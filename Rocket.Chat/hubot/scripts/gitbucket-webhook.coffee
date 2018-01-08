querystring = require('querystring')

# Description:
#   "GitBucket プルリクコメント時のエンドポイント
#
# Dependencies:
#   "querystring": "0.1.0"
#
# Configuration:
#   None
#
# Commands:
#   None
#
# URLs:
#   GET /gitbucket/commit-comment
#
module.exports = (robot) ->
  robot.router.post "/hubot/gitbucket/commit-comment", (req, res) ->
    issue = "##{req.body.issue.number}: #{req.body.issue.title}"
    comment = req.body.comment.body.replace(/\r?\n/g, "")

    if comment.length > 50
      comment = comment.substring(0, 50) + '...'

    sender = req.body.sender.login

    envelope = {}
    envelope.user = {}
    envelope.user.room = envelope.room = 'hubot'
    envelope.user.type = 'groupchat'

    robot.send envelope, "#{issue}\n#{sender}のコメント\n#{comment}"

    res.end "OK"