# Wekan
[dockerで社内用かんばん「Wekan」を導入してタスク管理した話](http://qiita.com/mitsugogo/items/2799d96a4a53acbb22f0)を参考にして作成しました。

## 概要
[Wekan](https://github.com/wekan/wekan)は複数人でリアルタイムに編集できる、かんばんアプリです。
自分のタスク管理や、チームのタスク管理など様々な用途に使えます。

## 手順
* このプロジェクトをクローンします。

```
$ git clone https://github.com/Takumon/DockerSample.git
```

* Wekanに移動して、docker-compose.ymlを編集します。

```
$ cd DockerSample/Wekan
$ vi docker-compose.yml
```

* ROOT_URLとportsを設定してください。

```
wekan:
  image: mquandalle/wekan
  links:
    - wekandb
  environment:
    - MONGO_URL=mongodb://wekandb/wekan
    - ROOT_URL=http://your_host_ip:your_expose_psort # ipはホストのIPアドレス、ポートはportsと合わせる
  ports:
    - your_expose_psort:80 # ポートはROOT_URLのポートと合わせる
  restart: always
```

* 各コンテナを起動します。

```
$ docker-compose up -d

```

* 上記で設定したROOT_URLにアクセスできれば成功です。
