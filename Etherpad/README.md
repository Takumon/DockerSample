.gitignore# Etherpad
[Dockerで即実行できる、社内・自宅向けオープンソースWebアプリ](http://qiita.com/y_hokkey/items/406b5a8c4bc15354d069)を参考にして作成しました。

## 概要
[Etherpad](http://etherpad.org/)は複数人で同時編集でき、チャットも可能なWebノートパッドです。

## 手順
* このプロジェクトをクローンします。

```
$ git clone https://github.com/Takumon/DockerSample.git
```

* Etherpadに移動して、docker-compose.ymlを編集します。

```
$ cd DockerSample/Etherpad
$ vi docker-compose.yml
```

* ETHERPAD_ADMIN_PASSWORDを自分の好きなパスワードに変えてください。

```
  environment:
    - ETHERPAD_ADMIN_PASSWORD=your_password
```

* 各コンテナを起動します。
```
$ docker-compose up -d

```

* ブラウザでローカルホスト9001番にアクセスできれば成功です。
