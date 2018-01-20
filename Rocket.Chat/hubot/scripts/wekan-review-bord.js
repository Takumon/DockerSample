const rp = require('request-promise');
// 縛り
// wekanにあらかじめボードのみつくっておく
// ボードはパブリック
// タイトルが通称のリストを作成も作っておく（プログラムで作っってもいいが、タイポの時にリストが謝って作成されてしまうのを防ぐため、リストは事前に作成してもらうようにする）
// タイトルがcloseのリストを作成

const roomName = 'hubot';

const WEKAN = {
  protocol: 'http',
  host: '10.74.71.31',
  port: '10085',
};

const WEKAN_ROOT_URL = `${WEKAN.protocol}://${WEKAN.host}:${WEKAN.port}`;

const GITBUCKET = {
  protocol: 'http',
  commentUserName: 'jenkins',
  commentUserPassword: 'jenkins',
  host: '10.74.71.31',
  port: '8080',
  prefix: 'gitbucket'
};

const GITBUCKET_ROOT_URL = `${GITBUCKET.protocol}://${GITBUCKET.commentUserName}:${GITBUCKET.commentUserPassword}@${GITBUCKET.host}:${GITBUCKET.port}/${GITBUCKET.prefix}`;

// GitBucketのリポジトリ名とWekanのボード名
WEKAN_INFO = {
  'SampleGroup/SampleProject': {
    boardName: 'レビューステータス_sample-project',
    admin: {
      id: 'inoue',
      pass: 'password'
    },
    member: [
      {
        gitbucketUserName: 'inoue',
        gitbucketNickName: '井上',
        wekanListName: '井上',
        wekanUserName: 'inoue',
      },
      {
        gitbucketUserName: 'suzuki',
        gitbucketNickName: '鈴木',
        wekanListName: '鈴木',
        wekanUserName: 'suzuki',
      },
      {
        gitbucketUserName: 'saito',
        gitbucketNickName: '斎藤',
        wekanListName: '斎藤',
        wekanUserName: 'saito',
      }
    ]
  }
};




// 新規レビュー依頼
// チケット新規起票 XXXさんのところに
// 起票者　コメントした人
// タイトルはプルリク名
// ラベル「レビュー」
// コメント（GitBucketのコメントそのまま）
// リンクはる
const REVIEW_REQUEST_COMMENT_PATTERN = /^(.+)さんレビューお願いします/;

// レビュー完了（指摘あり 要レビュー修正）
// チケット移動（コメントした人から　XXXさん）
// ラベル変更（（「レビュー）」→「（レビュー修正）」）
// コメント追加（GitBucketのコメントそのまま　 コメント起票者 コメントした人）
const REVISION_REQIEST_COMMENT_PATTERN = /^(.+)さんレビューしました/;

// 再レビュー依頼
// チケット移動（コメントした人から、XXXさん）
// ラベル変更（「（レビュー修正）」→「（レビュー）」）
// コメント追加（GitBucketのコメントそのまま　コメント起票者　コメントした人）
const RE_REVIEW_RREQUEST_COMMENT_PATTERN = /^(.+)さん再度レビューお願いします/;

// レビュー完了（指摘なし）
// チケット移動（コメントした人から　CLOSEリスト）
// コメント追加（GitBucketのコメントそのまま　 コメント起票者 コメントした人）
const REVIEW_COMPLETION_COMMENT_PATTERN = /^(.+)さんレビュー完了です/;


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
 * 指定された引数をもとにレビュー依頼文を作成する
 *
 * @param {*} repositoryFullName
 * @param {*} repositoryLink
 * @param {*} reviewerNickName
 * @param {*} revieweeNickName
 * @param {*} pullRequestNumber
 * @param {*} pullRequestLink
 * @param {*} comment
 */
const createBotComment = (repositoryFullName, repositoryLink, reviewerNickName, revieweeNickName, pullRequestNumber, pullRequestLink, comment) => {

  let formatted = [];
  formatted.push(`#### レビュー依頼`);
  formatted.push(`リポジトリ: [${repositoryFullName}](${repositoryLink})`);
  formatted.push(`プルリク: [${pullRequestNumber}](${pullRequestLink})`);
  formatted.push(`\`${revieweeNickName}\`が\`${reviewerNickName}\`にレビュー依頼`);
  formatted.push(`##### コメント`);
  formatted.push(`${comment}`);

  return formatted.join('\n');
};




const loginToWekanAndGetToken = (wekanInfo) => {
  const loginUrl = `${WEKAN_ROOT_URL}/users/login`

  return rp({
    uri: loginUrl,
    method: 'POST',
    body: {
      username: wekanInfo.admin.id,
      password: wekanInfo.admin.pass
    },
    json: true
  });
}

const getUsers = (wekanInfo, token) => {
  const url = `${WEKAN_ROOT_URL}/api/users`

  return rp({
    uri: url,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}

const getBoards = (wekanInfo, userId, token) => {
  const url = `${WEKAN_ROOT_URL}/api/users/${userId}/boards`

  return rp({
    uri: url,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}

const getLists = (wekanInfo, token, boardId) => {
  const url = `${WEKAN_ROOT_URL}/api/boards/${boardId}/lists`

  return rp({
    uri: url,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    },
    json: true
  });
}


const registerCard = (wekanInfo, token, boardId, listId, author, title) => {
  const loginUrl = `${WEKAN_ROOT_URL}/api/boards/${boardId}/lists/${listId}/cards`

  const options = {
    uri: loginUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type' : 'application/json'
    },
    body: {
      title: title,
      authorId: author,
    },
    json: true
  };

  return rp(options);
};



const createCardComment = (wekanInfo, token, boardId, listId, cardId, authorId, comment) => {
  const loginUrl = `${WEKAN_ROOT_URL}/api/boards/${boardId}/cards/${cardId}/comments`

  const options = {
    uri: loginUrl,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type' : 'application/json'
    },
    body: { comment, authorId },
    json: true
  };

  console.log(options);
  return rp(options);
};

/**
 * 指定された引数をもとにレビュー用チケットを新規作成する
 *
 */
const createCard = (
  repositoryFullName,
  repositoryLink,
  reviewerNickName,
  revieweeNickName,
  pullRequestNumber,
  pullRequestLink,
  pullRequestTitle,
  comment,
  botComment) => {
  const wekanInfo = WEKAN_INFO[repositoryFullName];
  const boardName = wekanInfo.boardName;


  // ログインしてトークン保持
  loginToWekanAndGetToken(wekanInfo).then(({id, token}) => {
    console.log(`ログイン成功　token= ${token}`);

    getUsers(wekanInfo, token).then(users => {
      console.log(`ユーザ`);
      console.log(users);


      getBoards(wekanInfo, id, token)
      .then(boards => {
        console.log(boards);
        if (boards.length === 0
          || boards.filter(b => b.title === boardName).length === 0) {
          console.log(`ボード[${boardName}]が存在しません。`);
          return;
        }

        const boardId = boards.filter(b => b.title === boardName)[0]._id;

        getLists(wekanInfo, token, boardId)
        .then(lists => {

          // レビューする人
          const {
            wekanListName: listTitle,
            wekanUserName: reviewerName,
          } = wekanInfo.member.filter(m => m.gitbucketNickName === reviewerNickName)[0];
          const reviewerId = users.filter(u => u.username === reviewerName)[0]._id;


          // レビュー依頼した人
          const revieweeName = wekanInfo.member.filter(m => m.gitbucketNickName === revieweeNickName)[0].wekanUserName;
          const revieweeId = users.filter(u => u.username === revieweeName)[0]._id;


          if (lists.length === 0
            || lists.filter(b => b.title === listTitle).length === 0) {
            console.log(`ボード[${boardName}]にリスト[${listTitle}]が存在しません。`);
            return;
          }

          const listId = lists.filter(b => b.title === listTitle)[0]._id;


          registerCard(wekanInfo, token, boardId, listId, revieweeId, `レビュー:\`${pullRequestTitle}\``)
          .then(res => {
            console.log('処理成功');

            const cardId = res._id;
            createCardComment(wekanInfo, token, boardId, listId, cardId, revieweeId, botComment)
            .then(res => {
              console.log('コメント登録成功');
            })
            .catch(err => {
              console.log('コメント登録失敗');
              console.log(err);
            })
          })
          .catch(err => {
            console.log('処理失敗')
            console.log(err);
          })
        })

      })
      .catch(err => {
        console.log(err);
      });

    })



  })
  .catch(err => {
    console.log(`ログイン失敗 err=${err}`);
  })

  // ボード見つけて boardId保持
  // リスト見つけて
  // リストからreviewerの名前のリストを見つけて listId保持

  // boardIdとlistIdをもとにチケット登録
  // タイトル　プルリク名
  // ラベル　レビュー
  // コメント レビュアーから　commnet

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
  robot.router.post('/hubot/gitbucket/review-status', (req, response) => {
    if (!req.body.comment
      || !req.body.comment.body
      || !req.body.issue
      || !req.body.issue.number) {

        console.log('処理対象外コメントです。')
        response.end('Out of target.');
      return;
    }

    const comment = req.body.comment.body;
    const commenter = req.body.comment.user.login;
    const pullRequestLink = req.body.comment.html_url;
    const repositoryFullName = req.body.repository.full_name;
    const repositoryLink = req.body.repository.html_url;
    const pullRequestNumber = req.body.issue.number;
    const pullRequestTitle = req.body.issue.title;

    const wekanInfo = WEKAN_INFO[repositoryFullName];

    console.log('req.body.comment.body=' + comment)
    if(REVIEW_REQUEST_COMMENT_PATTERN.test(comment)) {
      console.log('レビュー依頼のコメントです。')

      const reviewerNickName = comment.match(REVIEW_REQUEST_COMMENT_PATTERN)[1];
      const revieweeNickName = wekanInfo.member.filter(m => m.gitbucketUserName === commenter)[0].gitbucketNickName;

      const envelope = {}
      envelope.user = {}
      envelope.user.room = envelope.room = roomName;
      envelope.user.type = 'groupchat'

      const botComment = createBotComment(repositoryFullName, repositoryLink, reviewerNickName, revieweeNickName, pullRequestNumber, pullRequestLink, comment);
      console.log('botComment = ' + botComment);
      robot.send(envelope, botComment);

      createCard(repositoryFullName, repositoryLink, reviewerNickName, revieweeNickName, pullRequestNumber, pullRequestLink, pullRequestTitle, comment, botComment);
      console.log('処理成功');
      response.end('OK');
    }

  });
};