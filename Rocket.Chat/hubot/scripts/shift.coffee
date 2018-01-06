shiftList = [
  '太郎',
  '二郎',
  '三郎',
  '健四郎',
  '花子'
]

REDIS_PREFFIX = 'bot_shift_'
REDIS_KEY_OF_CURRENT_SHIFT_INDEX = "#{REDIS_PREFFIX}_current_shift_index"

module.exports = (robot) ->

  # 次はだれか
  robot.respond /s(?:hift)? show/i, (msg) ->
    console.log(robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_INDEX)

    # 担当未設定の場合は最初の人が次の担当とみなす
    if not (robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_INDEX)?
      msg.send "今の当番は未設定です。"
      msg.send "次の当番は#{shiftList[0]}です。"
      return

    currentIndex = robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_INDEX
    nextIndex = currentIndex + 1;
    # 現在の担当が最後の人だったら最初に戻す
    nextIndex = nextIndex % shiftList.length

    msg.send "今の当番は#{shiftList[currentIndex]}です。"
    msg.send "次の当番は#{shiftList[nextIndex]}です。"

  # 次の人に当番を割り当てる
  robot.respond /s(?:hift)? next/i, (msg) ->
    console.log(robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_INDEX)

    if not (robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_INDEX)?
      robot.brain.set REDIS_KEY_OF_CURRENT_SHIFT_INDEX, 0
      msg.send　"次の当番に#{shiftList[0]}を割り当てました。"
      return

    nextIndex = (robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_INDEX) + 1;
    console.log "nextIndex = #{nextIndex}"
    # 現在の担当が最後の人だったら最初に戻す
    nextIndex = nextIndex % shiftList.length
    robot.brain.set REDIS_KEY_OF_CURRENT_SHIFT_INDEX, nextIndex

    msg.send　"次の当番に#{shiftList[nextIndex]}を割り当てました。"