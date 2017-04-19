# SonarQube
[Docker ComposeでSonarQubeの環境を作る](http://qiita.com/ot-aoyagi/items/d97b2431fefbf5635e93)を参考にして作成しました。

## 概要
[SonarQube](https://www.sonarqube.org/)はスイス製のプログラム品質管理ツールです。
静的コード解析やカバレッジなどをソースコードベースで可視化してくれて、
プロジェクト全体の品質などをグラフ化してくれます。

## 手順
* このプロジェクトをクローンします。

```
$ git clone https://github.com/Takumon/DockerSample.git
```

* SonarQubeに移動して、各コンテナを起動します。

```
$ cd SonarQube
$ docker-compose up -d

```

* ブラウザでローカルホスト9000番にアクセスできれば成功です。
