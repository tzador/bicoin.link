# bicoin.link

Please visit [bicoin.link](https://bicoin.link) to try it live.

## Useful commands

- `make` run locally in dev mode
- `make docker` build and publish to docker hub
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

# Protocol (HTTP + WebSocket)

HTTP

    { "query": "balance.get#user-id-12345", "echo": 123456789 }
    { "result": "balance.get#user-id-12345", value: 4, "echo": 123456789 }
    { "action": "balance.get#user-id-12345", "echo": 123456789 }
    { "update": "balance.get#user-id-12345", value: 4, "echo": 123456789 }

WebSocket

    { "query": "balance.get#user-id-12345", "echo": 123456789 }
    { "result": "balance.get#user-id-12345", value: 4, "echo": 123456789 }
    { "action": "balance.get#user-id-12345", "echo": 123456789 }
    { "update": "balance.get#user-id-12345", value: 4, "echo": 123456789 }

# TODO

- render bets as lines
- render times label
- render price labels
- render zoom
- render local times
- render open and close time of the bet in the bet list(or current time if not yet resolved)
- render responsivly / mobile friendly

- animate min/max price

- implement bets timeout
- implement disallow overlaping bets
- impleent pub/sub for cross server broadcast
- implement scores
- implement deletion of old bets (or just keep the last 11)

- sound/speach

- write tests
- record a screen recording and speed it up as gif

# WISH LIST

- multiple tickers

# DONE

- render price history
- https redirect
- retina support / devicePixelRatio / DPI
- deploy using CDK to AWS
- animated favicon
