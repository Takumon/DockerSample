# Description
#   A Hubot script for 交代制当番管理
#
# Configuration:
#   None
#
# Commands:
#   hubot shift show - 今の当番と次の当番を確認する
#   hubot shift next - 当番を次に進める
shiftNameList = [
  '斎藤 太郎',
  '福島 二郎',
  '轟 三郎',
  '藤井 健四郎',
  '渡部 花子'
]

REDIS_PREFFIX = 'bot_shift_'
REDIS_KEY_OF_CURRENT_SHIFT_NAME = "#{REDIS_PREFFIX}_current_shift_name"

module.exports = (robot) ->

  # 次はだれか
  robot.respond /s(?:hift)? show/i, (msg) ->

    # 担当未設定の場合は最初の人が次の担当とみなす
    if not robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_NAME
      robot.brain.set REDIS_KEY_OF_CURRENT_SHIFT_NAME, shiftNameList[0]
      msg.send "今の当番は未設定です。"
      msg.send "次の当番は#{shiftNameList[0]}です。"
      return

    currentName = robot.brain.get REDIS_KEY_OF_CURRENT_SHIFT_NAME
    currentIndex = shiftNameList.indexOf currentName

    if currentIndex == -1
      robot.brain.set REDIS_KEY_OF_CURRENT_SHIFT_NAME, shiftNameList[0]
      msg.send "今の当番は未設定です。"
      msg.send "次の当番は#{shiftNameList[0]}です。"
      return

    nextIndex = currentIndex + 1
    # 現在の担当が最後の人だったら最初に戻す
    nextIndex = nextIndex % shiftNameList.length

    msg.send "今の当番は#{shiftNameList[currentIndex]}です。"
    msg.send "次の当番は#{shiftNameList[nextIndex]}です。"

  # 次の人に当番を割り当てる
  robot.respond /s(?:hift)? next/i, (msg) ->

    if not robot.brain.get(REDIS_KEY_OF_CURRENT_SHIFT_NAME)
      robot.brain.set(REDIS_KEY_OF_CURRENT_SHIFT_NAME, shiftNameList[0])
      msg.send("次の当番に#{shiftNameList[0]}を割り当てました。")
      return

    currentName = robot.brain.get(REDIS_KEY_OF_CURRENT_SHIFT_NAME)
    currentIndex = shiftNameList.indexOf(currentName)
    nextIndex = currentIndex + 1
    # 現在の担当が最後の人だったら最初に戻す
    nextIndex = nextIndex % shiftNameList.length
    robot.brain.set(REDIS_KEY_OF_CURRENT_SHIFT_NAME, shiftNameList[nextIndex])

    msg.send("次の当番に#{shiftNameList[nextIndex]}を割り当てました。")