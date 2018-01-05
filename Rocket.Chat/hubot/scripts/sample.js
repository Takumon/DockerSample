// Description:
//   先頭に"// Description:"コメントを書いておかないと起動時に警告(INFOだが)が出る。
module.exports = (robot) => {

  robot.hear(/hoge/i,(res) => {
    res.send("hoge! 全ての投稿でhearが含まれる投稿に反応して発言する。");
  });

  robot.respond(/piyo/i,(res) => {
      res.send("piyo! botの名前＋piyoが含まれる投稿に反応して発言する。");
      // 注意：
      // ここでのbotの名前はbin/hubotの中に書かれている --name 【名前】でも反応する。
      // これはyo hubot時に質問されるbotname。
      // ボット名はアットマークなしで反応する。
  });
};