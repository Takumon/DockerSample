const rp = require('request-promise');

// 前提条件
// ★Jenkinsのジョブ名はリポジトリ名と一致すること（これは本処理の実装上のしばり）
// GitBucketのリポジトリはjunitのテスト、CheckStyle、Findbugs、PMDをJenkinsfileで実行するようになっていること
// GitBucketのリポジトリのメンバーにgitbucketRoolで指定してるユーザが追加されていること
// GitBucketのリポジトリのWebhookとして本エンドポイントがissue commentで設定されていること
// jenkinsUrlに指定しているユーザでhenkinsにログインできること
// TODO 定数化
const jenkinsUrl = 'http://admin:admin@192.168.1.5:10080/jenkins';
const gitbucketRool = 'http://jenkins:jenkins@192.168.1.5:8080/gitbucket';
const roomName = 'hubot';

/**
 * Multi Branch Pipeline JOBの最新ビルド結果を取得する
 *
 * @param {*} repository リポジトリ名
 * @param {*} job JenkinsのJob名(ブランチ名)
 */
const getJenkinsBuildResult = (repository, job) => {
  const baseUrl = `${jenkinsUrl}/job/${repository}/job/${job}/lastBuild`;
  const statusUrl = `${baseUrl}/api/json`;
  const testUrl = `${baseUrl}/testReport/api/json`;
  const checkstyleUrl = `${baseUrl}/checkstyleResult/api/json`;
  const findbugsUrl = `${baseUrl}/findbugsResult/api/json`;
  const pmdUrl = `${baseUrl}/pmdResult/api/json`;

  return Promise.resolve()
  .then(() => {

    return Promise.all([
      rp({ uri: statusUrl, json: true }).then( res => {
        return {
          name: 'build',
          link: res.url ,
          result: res.result
        };
      }),
      rp({ uri: testUrl, json: true }).then( res => {
        return {
          name: 'test',
          fail: res.failCount,
          pass: res.passCount,
          skip: res.skipCount,
          all: res.failCount + res.passCount + res.skipCount
        };
      }),
      rp({ uri: checkstyleUrl, json: true }).then( res => {
        return {
          name: 'checkstyle',
          hight: res.numberOfHighPriorityWarnings,
          low: res.numberOfLowPriorityWarnings,
          nomal: res.numberOfNormalPriorityWarnings,
          all: res.numberOfWarnings
        };
      }),
      rp({ uri: findbugsUrl, json: true }).then( res => {
        return {
          name: 'findbugs',
          hight: res.numberOfHighPriorityWarnings,
          low: res.numberOfLowPriorityWarnings,
          nomal: res.numberOfNormalPriorityWarnings,
          all: res.numberOfWarnings
        };
      }),
      rp({ uri: pmdUrl, json: true }).then( res => {
        return {
          name: 'pmd',
          hight: res.numberOfHighPriorityWarnings,
          low: res.numberOfLowPriorityWarnings,
          nomal: res.numberOfNormalPriorityWarnings,
          all: res.numberOfWarnings
        };
      }),
    ]);
  });
};



/**
 * 指定したJenkinsビルド結果を元にマークダウン形式のコメント文にフォーマットしたものを返す
 *
 * @param {*} results
 */
const formatCommentFormMarkdown = results => {
  const buildResult = results.filter(obj => obj.name==='build')[0];
  const testResult = results.filter(obj => obj.name==='test')[0];
  const checkstyleResult = results.filter(obj => obj.name==='checkstyle')[0];
  const findbugsResult = results.filter(obj => obj.name==='findbugs')[0];
  const pmdResult = results.filter(obj => obj.name==='pmd')[0];


  let formatted = [];
  formatted.push(`#### [Jenkins最新ビルド結果](${buildResult.link})`);
  formatted.push(`**ステータス**`);
  formatted.push(`\`${buildResult.result}\``);
  formatted.push(``);
  formatted.push(`**テスト**`);
  formatted.push(``);
  formatted.push(`|全件|失敗|成功|スキップ|`);
  formatted.push(`|-:|-:|-:|-:|`);
  formatted.push(`|${testResult.all}|${testResult.fail}|${testResult.pass}|${testResult.skip}|`);
  formatted.push(`**静的コード解析**`);
  formatted.push(``);
  formatted.push(`||全件|高|中|低|`);
  formatted.push(`|:-:|-:|-:|-:|-:|`);
  formatted.push(`|checkstyle|${checkstyleResult.all}|${checkstyleResult.hight}|${checkstyleResult.nomal}|${checkstyleResult.low}|`);
  formatted.push(`|findbugsResult|${findbugsResult.all}|${findbugsResult.hight}|${findbugsResult.nomal}|${findbugsResult.low}|`);
  formatted.push(`|checkstyle|${pmdResult.all}|${pmdResult.hight}|${pmdResult.nomal}|${pmdResult.low}|`);
  return formatted.join('\n');
};


/**
 * 指定したプルリクのブランチを取得する
 *
 * @param {*} owner
 * @param {*} repository
 * @param {*} pullRequestNumber
 */
const getPullRequestBranch = (owner, repository, pullRequestNumber) => {
  const url = `${gitbucketRool}/api/v3/repos/${owner}/${repository}/pulls/${pullRequestNumber}`;

  return rp({
    method: 'GET',
    uri: url,
    json: true
  })
  .then( res => res.head.ref);
}



/**
 * 指定したGitBucketのプルリクにコメントを追加する
 * @param {*} owner
 * @param {*} repository
 * @param {*} pullRequestNumber
 * @param {*} commentText
 */
const addCommentToPullrequest = (owner, repository, pullRequestNumber, commentText) => {
  const url = `${gitbucketRool}/api/v3/repos/${owner}/${repository}/issues/${pullRequestNumber}/comments`;

  rp({
    method: 'POST',
    uri: url,
    body: {
      body: commentText
    },
    json: true
  });
};


/**
 * 指定したコメントをボットに呟く
 *
 * @param {*} robot
 * @param {*} comment
 */
const addCommentToChat = (robot, comment) => {
  const envelope = {}
  envelope.user = {}
  envelope.user.room = envelope.room = roomName;
  envelope.user.type = 'groupchat'

  robot.send(envelope, comment);
}


module.exports = (robot) => {
  robot.router.post('/hubot/gitbucket/check-jenkins', (req, response) => {
    if (!req.body.comment
      || !req.body.comment.body
      || !req.body.issue
      || !req.body.issue.number) {

        console.log('処理対象外コメントです。')
        response.end('Out of target.');
      return;
    }

    console.log('req.body.comment.body=' +  req.body.comment.body)
    if(req.body.comment.body !== 'Jenkins?') {
      console.log('処理対象外コメントです。')
      response.end('Out of target.');
      return;
    }

    console.log('処理対象のコメントです。')
    const owner = req.body.repository.full_name.split('/')[0];
    const repository = req.body.repository.full_name.split('/')[1];

    const pullRequestNumber = req.body.issue.number;

    getPullRequestBranch(owner, repository, pullRequestNumber)
    .then(branch => {
      return getJenkinsBuildResult(repository, branch)
    })
    .then(results => {
      const formatted = formatCommentFormMarkdown(results);

      // ボットに呟く場合はコメントアウト
      // addCommentToChat(robot, formatted);
      return addCommentToPullrequest(owner, repository, pullRequestNumber, formatted);
    })
    .then(res => {
      console.log('処理成功');
      response.end('OK');
    })
    .catch(err => {
      console.log('処理失敗 ' + err);
      response.end('NG ' + err);
    });
  });
};