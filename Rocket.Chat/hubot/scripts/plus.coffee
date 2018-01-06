module.exports = (robot) ->
  robot.hear /^(.+)\+\+$/i, (msg) ->
    user = msg.match[1]

    console.log user

    if not robot.brain.get user
      robot.brain.set user, 0

    count = robot.brain.get user
    console.log count
    robot.brain.set user, count + 1

    result = robot.brain.get user
    console.log result

    msg.send(result + '')