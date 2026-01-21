# js-logger
A simple JS Logger.

## Installation

```sh
npm i -S @kabukisolutions/js-logger
```

## Introduction and usage

This is a very basic loggin utility which
1. emits one JSON object per line when executing on the server side.
2. acts as run of the mill console.foo logger when executing in the browser (prints nothing in the browser unless NODE_ENV is development).
