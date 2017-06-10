Jenkins
=======

概要
----

言わずと知れた継続的インテグレーションツール[Jenkins](https://jenkins.io/)。

手順
----

-	このプロジェクトをクローンします。

```
$ git clone https://github.com/Takumon/DockerSample.git
```

-	Jenkinsに移動して、コンテナを起動します。

```
$ cd Jenkins
$ docker-compose up -d
```

-	ブラウザでローカルホスト8082番にアクセスできれば成功です。

-	アクセスすると最初にパスワードを求められるので、jenkinsコンテナに入ってパスワードを参照します。

```
$ docker exec -it jenkinsのコンテナ名 bash
jenkins@df6924091c22:/$ cat /var/jenkins_home/secrets/initialAdminPassword
XXXXXXXXXXXXX
```

-	コピーしたパスワードを入力して、Continueボタンをクリック
-	install suggested pluginsを選択

-	後はお好みで設定してください。
