---
title: "What Is AsyncAPI?"
description: "AsyncAPI is a format for describing event-driven APIs, the kind that send messages over Kafka, MQTT, or WebSocket. See one real message taken apart."
summary: "What AsyncAPI is and what an AsyncAPI document holds, shown with one real message."
lead: "AsyncAPI is a format for writing an event-driven API down in a file that both people and programs can read. This guide sends one real message, finds every piece of it in an AsyncAPI document, and shows the limits of the format."
order: 4
date: 2026-11-21
last_modified_at: 2026-11-26
image:
  path: /assets/images/guides/what-is-asyncapi.png
  webp: /assets/images/guides/what-is-asyncapi.webp
  width: 1200
  height: 630
  alt: "A sheet of paper headed AsyncAPI, with three rows of labelled lines and arrows, stands in the middle. A rounded square with a signal sign on the left sends an envelope into it, and three envelopes travel on to three solid squares on the right"
  caption: "Nobody asks. One sends, and everyone who listens receives."
toc:
  - id: what-is-asyncapi
    title: What is AsyncAPI?
  - id: event-driven
    title: What is an event-driven API?
  - id: inside
    title: What is in an AsyncAPI document?
  - id: a-message
    title: One message, taken apart
  - id: uses
    title: What can you do with an AsyncAPI document?
  - id: openapi
    title: What is the difference between AsyncAPI and OpenAPI?
  - id: versions
    title: "AsyncAPI 2 or 3: which one are you reading?"
  - id: limits
    title: The limits of AsyncAPI
  - id: next-steps
    title: Next steps
faq:
  - question: "What does AsyncAPI stand for?"
    answer: |
      AsyncAPI stands for asynchronous API. "Asynchronous" means the sender of a message does not stop and wait for an answer. It sends the message and carries on. The name is used for two things: the AsyncAPI Specification, which is the rule book, and the documents written by its rules.
  - question: "What is AsyncAPI used for?"
    answer: |
      AsyncAPI is used to describe APIs that work by sending messages. You meet them in places like these:

      - **Services inside a company** that tell each other what happened, often through Kafka.
      - **Devices**, such as sensors, that report over MQTT.
      - **Live updates** pushed to a browser or an app over WebSocket.

      In each case the AsyncAPI document says which messages exist, where they travel, and what they look like.
  - question: "What is the difference between a channel and a topic?"
    answer: |
      A channel is AsyncAPI's word for the place a message is sent to. A topic is what MQTT and Kafka call that place. Other protocols say queue, routing key, or path. AsyncAPI needed one word that fits all of them, so it says channel. The channel's `address` holds the real name the protocol uses.
  - question: "Is AsyncAPI the same as OpenAPI?"
    answer: |
      No. OpenAPI describes HTTP APIs, where you send a request and get a response. AsyncAPI describes message-driven APIs, where messages travel through channels and nobody has to ask first. The two look alike on purpose: AsyncAPI started from OpenAPI's ideas, and both have `info`, `servers`, and `components`. Many systems have both kinds of API and use both formats.
  - question: "Can AsyncAPI describe a WebSocket API?"
    answer: |
      Yes. WebSocket is one of the protocols AsyncAPI is used with. There is no broker in that case. The server in the document is the service that speaks WebSocket, and a client connects to it directly.
  - question: "Is AsyncAPI only for Kafka?"
    answer: |
      No. AsyncAPI does not belong to any one protocol. The specification names Kafka, MQTT, AMQP, JMS, STOMP, WebSocket, Google Pub/Sub, Pulsar, and others, and more can be added. The details that only one protocol has go into a part of the document called a binding.
  - question: "Who maintains AsyncAPI?"
    answer: |
      AsyncAPI is maintained by the AsyncAPI Initiative, an open source project under the Linux Foundation, which it joined in March 2021. The specification is developed in the open on [GitHub](https://github.com/asyncapi/spec), and anyone can read it and use it for free.
  - question: "What do send and receive mean in an AsyncAPI document?"
    answer: |
      `send` and `receive` say what the described application does. An operation with `action: send` means the application sends a message to the channel. An operation with `action: receive` means the application expects messages from the channel. Read both words from the side of the application the document describes, never from your own side.

      Version 2 documents use `publish` and `subscribe`, and they read the other way round: `publish` means the application receives, and `subscribe` means it sends.
  - question: "How does AsyncAPI relate to JSON Schema?"
    answer: |
      AsyncAPI uses JSON Schema to describe the shape of a message. The outer layers of a document (servers, channels, operations) are AsyncAPI's own. The part that says what a message's payload looks like is a schema. AsyncAPI's own schema format is JSON Schema draft 07 with a few additions. A payload can also be described in a different format, named with `schemaFormat`, for example Avro.
  - question: "How do I check that an AsyncAPI document is valid?"
    answer: |
      You check an AsyncAPI document by running a validator over it. The validator compares the file with the rules of the specification: the required fields are there, and every value is of the right kind.

      The AsyncAPI project offers two ways to do it. [AsyncAPI Studio](https://studio.asyncapi.com/) is an editor in the browser that checks the document as you type. The AsyncAPI CLI has a `validate` command for the terminal and for a CI pipeline, the automation that checks every change to a project.
  - question: "Can AsyncAPI describe a sequence of messages?"
    answer: |
      Only the smallest one, a request and its reply. An operation can have a `reply`, which describes both. Anything longer is an API workflow. An example: send a command, wait for the message that proves it worked, then call another API. A workflow needs a document of its own. [Arazzo](https://spec.openapis.org/arazzo/latest.html) is the OpenAPI Initiative's format for that. Since version 1.1 an Arazzo document can point at an AsyncAPI document. A step can then send or receive a message on one of its channels.
---

A streetlight measures how bright the evening is. A program in the city's control room wants to know. So what does the program do?

It could ask. And ask again a second later, and again, for every streetlight in the city. Most of the answers would be "nothing has changed".

Well, there is a better way. The streetlight tells. When it has a new measurement, it sends a message, and everyone who cares receives it. Nobody had to ask.

An API that works this way is called event-driven, and AsyncAPI is a format for writing one down. If you work next to such systems and keep hearing "it's on the topic" or "check the AsyncAPI", this guide was written just for you.

This is the third guide in a series. The second one, [What Is OpenAPI?]({{ '/docs/guides/what-is-openapi/' | relative_url }}), covers HTTP APIs, where you ask and get an answer. You don't have to read it before this one, but it helps.

## What is AsyncAPI? {#what-is-asyncapi}

AsyncAPI is a format for describing a message-driven API in plain text files. In the specification's own words, it is "used to describe message-driven APIs in a machine-readable format". The specification says message-driven, and many people say event-driven. This guide treats the two as the same thing.

Two things carry the name, and they are easy to mix up:

- **The AsyncAPI Specification** is the rule book. It says how to describe any message-driven API. There is one, and the AsyncAPI Initiative publishes it.
- **An AsyncAPI document** follows those rules to describe the API of one application. There are as many as there are applications.

A document is plain text, written in YAML or JSON. Both are text formats for data. People can read them, and so can programs. A document can be one file, or it can be split into several files that point at each other. By convention the file is named `asyncapi.yaml` or `asyncapi.json`.

Notice the word "application". An AsyncAPI document describes one program: which messages it sends, and which messages it receives. We will come back to this, because it decides how every line in the document is read.

And the format belongs to no protocol. Messages can travel over Kafka, MQTT, AMQP, WebSocket, and many others. AsyncAPI describes them all in the same way.

## What is an event-driven API? {#event-driven}

Start with the kind of API most people meet first. With an [HTTP API]({{ '/docs/guides/what-is-an-api/' | relative_url }}), you send a request and you wait. The server answers you, and only you. Nothing happens until somebody asks.

An event-driven API turns this around. Something happens, and a program announces it by sending a message. It does not wait for an answer. That is what "asynchronous" means here.

You meet such APIs where many programs must react to the same thing. Services inside a company pass events to each other, often through Kafka. Devices such as sensors report over MQTT.

These are the words you need:

- **A message** is the piece of data that travels. It has a **payload**, the data itself, and it can have headers, the notes about the data.
- **A channel** is the place a message is sent to. It has an address, a little like the path of an HTTP API. MQTT and Kafka call it a topic.
- **A broker** is the program in the middle. Senders and receivers connect to it, and it passes the messages on. Many event-driven systems have one. AsyncAPI's word is **server**, and it also covers a service you connect to directly, as with WebSocket.
- **A sender** sends messages to a channel. **A receiver** receives messages from a channel. One program can do both.

You may know a small relative of this already: the **webhook**. You give another service an address of yours, and it calls you over HTTP when something happens. The idea is the same. Nobody asks, and the news comes to you. But a webhook has no broker and no channels. The sender calls each receiver itself, one address at a time.

What is different from a request? Three things:

- **Nobody asks.** A receiver says once which channels it wants to listen on. After that the messages arrive by themselves.
- **The sender does not know who listens.** It hands the message to the broker. There may be one receiver, a hundred, or none.
- **There is no answer.** The sender does not learn what the receivers did with the message. They can tell it only by sending a message of their own.

This way of working is called **publish and subscribe**. A sender publishes, and a receiver subscribes.

Now look at those three things again from the receiver's side. A message arrives, and there is nobody to ask what it means. The sender is somewhere behind the broker. And when a sender gets a message wrong, no error comes back to it. The only place the two sides can agree is a description that both of them read. That is why such an API gets written down.

## What is in an AsyncAPI document? {#inside}

Let's look at a real one. The AsyncAPI project keeps a set of example documents next to the specification. One of them is the Streetlights API, for a pretend company that manages city lights. It uses MQTT, a small protocol made for devices such as sensors.

Here is the top level of the file, with nearly everything inside left out:

```yaml
asyncapi: 3.1.0
info:
  title: Streetlights MQTT API
  version: 1.0.0
servers:
  production:
    host: 'test.mosquitto.org:{port}'
    protocol: mqtt
channels:
  lightingMeasured:
    # one channel: where the measurements travel
operations:
  receiveLightMeasurement:
    # one operation: what the application does on that channel
components:
  messages:
    lightMeasured:
      # what a measurement looks like
```

These are the six parts you will find in nearly every document:

- **`asyncapi`** says which version of the AsyncAPI format the file is written in. Here it is 3.1.0.
- **`info`** is about the API: its name, and a version number of its own. Notice that these are two different version numbers. `3.1.0` is the version of the AsyncAPI format. `1.0.0` is the version of the Streetlights API.
- **`servers`** says where the application connects to, and which protocol it speaks there. Here it is a broker at `test.mosquitto.org`, and the protocol is MQTT.
- **`channels`** lists the places the messages travel through. Each channel has an address and the messages that are allowed on it.
- **`operations`** says what the application does: on this channel it sends, on that one it receives.
- **`components`** holds the pieces that are used in more than one place. Most of them are messages and **schemas**. A schema is a description of what a piece of data looks like.

The Streetlights document has 4 channels, 4 operations, 3 messages, and 4 schemas. It is a small API. A large one can have hundreds of channels, and it is still built from the same parts.

## One message, taken apart {#a-message}

A streetlight reports a measurement. Let's send that message for real, and then find every piece of it in the document.

The broker in the document, `test.mosquitto.org`, is a public test broker that anyone may use. To talk to it we need an MQTT client, a program that connects to a broker. The Mosquitto project has two for the terminal: `mosquitto_sub` receives messages and `mosquitto_pub` sends one.

You can just read along. Every output is shown.

To run the commands yourself, you need both clients. This is how you get them:

```bash
sudo apt install mosquitto-clients   # Ubuntu, Debian
brew install mosquitto               # macOS
```

For other systems, see the [Mosquitto download page](https://mosquitto.org/download/).

<details markdown="1">
<summary>Rather not install anything? Use Docker</summary>

The official Mosquitto image has both clients inside. Put `docker run --rm eclipse-mosquitto:2` in front of a command, and it runs in a container that is thrown away afterwards:

```bash
docker run --rm eclipse-mosquitto:2 \
  mosquitto_sub -h test.mosquitto.org -q 1 -v \
  -t 'smartylighting/streetlights/1/0/event/+/lighting/measured'
```

The same prefix works for `mosquitto_pub`. Ctrl+C stops the waiting command.

</details>

First we play the application in the control room. This command subscribes to the measurements of every streetlight, and then waits:

```bash
mosquitto_sub -h test.mosquitto.org -q 1 -v \
  -t 'smartylighting/streetlights/1/0/event/+/lighting/measured'
```

Now we play streetlight number 42. In a second terminal, we send one measurement:

```bash
mosquitto_pub -h test.mosquitto.org \
  -t 'smartylighting/streetlights/1/0/event/42/lighting/measured' \
  -m '{"lumens": 320, "sentAt": "2026-11-21T10:15:00Z"}'
```

The second terminal prints nothing. The first one, which was waiting, prints this:

```
smartylighting/streetlights/1/0/event/42/lighting/measured {"lumens": 320, "sentAt": "2026-11-21T10:15:00Z"}
```

That is the address the message was sent to, and then its payload. The receiver never asked for it. It said once what it wanted to hear, and the message arrived. (The broker is public, so you may see other people's messages there too.)

Now let's find the message in the document. We start with the channel:

```yaml
channels:
  lightingMeasured:
    address: 'smartylighting/streetlights/1/0/event/{streetlightId}/lighting/measured'
    messages:
      lightMeasured:
        $ref: '#/components/messages/lightMeasured'
    description: The topic on which measured values may be produced and consumed.
    parameters:
      streetlightId:
        $ref: '#/components/parameters/streetlightId'
```

- **`lightingMeasured`** is the channel's name inside the document. The message itself never carries this name.
- **`address`** is the real name, the one the protocol uses. MQTT calls it the topic. It has a placeholder, `{streetlightId}`. Fill in `42` and you have the address we sent to.
- **`messages`** lists what may travel on this channel. There is one kind, `lightMeasured`. The `$ref` is a reference: it points at another place in the same file.
- **`parameters`** describes the placeholder.

Next comes the operation:

```yaml
operations:
  receiveLightMeasurement:
    action: receive
    channel:
      $ref: '#/channels/lightingMeasured'
    summary: >-
      Inform about environmental lighting conditions of a particular
      streetlight.
    traits:
      - $ref: '#/components/operationTraits/mqtt'
    messages:
      - $ref: '#/channels/lightingMeasured/messages/lightMeasured'
```

Look at the line `action: receive`. A streetlight sent this message. Why does the document say "receive"?

Because of whose document this is. It describes one application: the program in the control room. In our two terminals, `mosquitto_sub` played that application, and `mosquitto_pub` played a streetlight. The application receives the measurements. The streetlights send them.

A streetlight could have a document of its own. There the same message would be under `action: send`.

The other three operations in this document are `turnOn`, `turnOff`, and `dimLight`. All three have `action: send`. So the application receives one kind of message and sends three. The measurement is an **event**: it says something happened. The other three are **commands**: they tell a streetlight to do something.

Here is the message, and the schema it points at. One part is left out: a line that adds an optional header to the message.

```yaml
components:
  messages:
    lightMeasured:
      name: lightMeasured
      title: Light measured
      summary: >-
        Inform about environmental lighting conditions of a particular
        streetlight.
      contentType: application/json
      payload:
        $ref: '#/components/schemas/lightMeasuredPayload'
  schemas:
    lightMeasuredPayload:
      type: object
      properties:
        lumens:
          type: integer
          minimum: 0
          description: Light intensity measured in lumens.
        sentAt:
          $ref: '#/components/schemas/sentAt'
    sentAt:
      type: string
      format: date-time
      description: Date and time when the message was sent.
```

- **The message** says the payload is JSON, and points at a schema for its shape.
- **The schema** says the payload is an object with two properties. `lumens` is a whole number, zero or more. `sentAt` is a date and a time. Our payload had `320` and `2026-11-21T10:15:00Z`. It fits.

One line of the operation is still open: `traits`. It points at a shared piece that several operations use. All four operations in this document point at the same one:

```yaml
components:
  operationTraits:
    mqtt:
      bindings:
        mqtt:
          qos: 1
```

This piece holds a single MQTT setting. A **binding** is the place for details that belong to one protocol only. `qos: 1` is MQTT's way of saying "deliver this at least once". The application receives with that setting, and that is why our `mosquitto_sub` command had `-q 1`.

So every piece of the message has its place in the document:

| What happened | In the document |
| --- | --- |
| The application connected to `test.mosquitto.org` | `servers`, the `host` of `production` |
| It spoke MQTT | `protocol: mqtt` |
| It asked for delivery at least once, `-q 1` | the MQTT binding, `qos: 1` |
| The message went to `smartylighting/.../42/lighting/measured` | the `address` of the channel `lightingMeasured` |
| `42` | the parameter `streetlightId` |
| The JSON payload | `application/json`, and the `lightMeasuredPayload` schema |
| The application received it | the operation `receiveLightMeasurement`, `action: receive` |

One thing we typed is not in the document: the `+` in the subscription. It is MQTT's sign for "any one value here", so we heard every streetlight and not only number 42. How a receiver subscribes is the protocol's business. The document says what the address looks like.

## What can you do with an AsyncAPI document? {#uses}

One file, once written, feeds many tools. These are the common uses:

- **Documentation.** A tool turns the document into a web page with every channel, operation, and message on it.
- **Code.** A generator writes the code that talks to the broker, in one of the languages it supports.
- **Checking messages.** A program can compare each message with its schema, before it is sent or after it arrives. [The limits of AsyncAPI](#limits) shows what happens when nobody does.
- **Trying things out.** A tool reads the document and sends made-up messages in the right shape. The receivers can be built before the real senders exist.
- **Review and discovery.** A tool compares two versions and reports the changes that would break a receiver. A catalogue built from many documents says who sends what, and where.

The AsyncAPI project keeps a list of such tools at [asyncapi.com/tools](https://www.asyncapi.com/tools).

## What is the difference between AsyncAPI and OpenAPI? {#openapi}

[OpenAPI]({{ '/docs/guides/what-is-openapi/' | relative_url }}) describes an API you ask. AsyncAPI describes an API that tells you.

Here are the two side by side:

| Question | OpenAPI | AsyncAPI |
| --- | --- | --- |
| What does it describe? | An HTTP API | A message-driven API |
| How do the two sides talk? | A request, then a response | A message, and no answer by default |
| Which protocol? | HTTP | Many: Kafka, MQTT, AMQP, WebSocket, and more |
| Where does the data go? | To a path | To a channel |
| What is an operation? | One HTTP method on one path | Send or receive, on one channel |
| Whose side is described? | The server's: what a caller may ask for | One application's: what it sends and what it receives |
| How is data described? | Schemas | Schemas |

The two look alike, and that is no accident. AsyncAPI was started in 2016 with OpenAPI as its model. Its specification still opens with a thank-you. "Part of this content has been taken from the great work done by the folks at the OpenAPI Initiative." That is why `info`, `servers`, `components`, and `$ref` look the same in both. If you can read one format, you can find your way around the other.

They are not rivals. Many systems have both kinds of API: an HTTP API for the things you ask for, and messages for the things you are told. Such a system has an OpenAPI description and an AsyncAPI document, side by side.

There is one place where the two meet: the webhook. A webhook is an event that travels over plain HTTP, so both formats can describe it. OpenAPI has a `webhooks` field for it. AsyncAPI lists HTTP among its protocols. So which one do you pick? Look at what the webhook lives next to. If it belongs to an HTTP API that already has an OpenAPI description, keep it there. If it sits beside events on Kafka or MQTT, an AsyncAPI document keeps all the events in one place.

## AsyncAPI 2 or 3: which one are you reading? {#versions}

Before you read an AsyncAPI document, look at its `asyncapi` field. If the number starts with 2, the document is laid out differently from the one in this guide. Two of its words also mean the opposite of what you would expect.

| Version | Released | What it brought |
| --- | --- | --- |
| 1.0 | 2017 | The first version. Channels were still called topics. |
| 2.0 | 2019 | Channels, and bindings for the details of each protocol. |
| 3.0 | 2023 | Channels and operations became separate parts. `send` and `receive` replaced `publish` and `subscribe`. A request and its reply can be described. |

Version 3.1 followed in 2026. It added a binding for one more protocol. A 3.0 document and a 3.1 document read the same.

Here is our channel as the same example looked in version 2.6, with a few lines left out:

```yaml
channels:
  smartylighting/streetlights/1/0/event/{streetlightId}/lighting/measured:
    publish:
      operationId: receiveLightMeasurement
      message:
        $ref: '#/components/messages/lightMeasured'
```

Two things are different:

- **The operation is inside the channel.** In version 2 the address is the channel's name, and the operation hangs under it. In version 3 the two are separate, so one channel can be used by several operations.
- **The word says `publish`, but the application receives.** In version 2, `publish` meant that others may publish here. The release notes of version 3 say these two words "have always been confusing". Version 3 says `action: receive`: what the application does, in plain words.

So here is the rule for a version 2 file: `publish` means the application receives, and `subscribe` means it sends.

If you are the one writing, take version 3 for a new document when your tools support it. An existing version 2 document can stay as it is. Moving it is a conversion, and the AsyncAPI project has a [converter](https://github.com/asyncapi/converter-js) for it.

## The limits of AsyncAPI {#limits}

A document is an agreement written down. Writing it down does not do everything.

**It does not make anyone keep to it.** Here is one more message from streetlight 42:

```bash
mosquitto_pub -h test.mosquitto.org \
  -t 'smartylighting/streetlights/1/0/event/42/lighting/measured' \
  -m '{"lumens": "bright"}'
```

The schema says `lumens` is a whole number. Here is what the receiver prints:

```
smartylighting/streetlights/1/0/event/42/lighting/measured {"lumens": "bright"}
```

The broker delivered it. It has never seen the document, and it passes on whatever it is given. Only a program that checks each message against the document can catch this.

**It does not connect one message to the next.** This is the one that matters most here.

Say you want to test that streetlight 42 works. You send it a `turnOn` command. Then you wait for a measurement from streetlight 42 and check that `lumens` went up.

Both halves are in the Streetlights document, down to the last field. `turnOn` is an operation, and `receiveLightMeasurement` is another. But nothing in the file ties them together. It does not say that the measurement you wait for belongs to the command you sent. It does not say which streetlight number to carry from one to the other. And it does not say what counts as "it worked".

AsyncAPI has one feature that comes close, called **reply**. An operation can say that a message will be answered, and on which channel. That is a pair, not a sequence. There is no list of steps, and nothing checks whether a step worked.

So the test above is described nowhere. It is in a script, or in the head of the person who runs it.

One thing in the document helps, and we have already used it. Every operation has a name: `turnOn`, `receiveLightMeasurement`. A document that describes a sequence does not have to repeat the channels and the schemas. It can name the operations and say what is carried from one to the next.

A sequence of calls and messages with a purpose is called an **API workflow**.

So there it is. AsyncAPI describes every channel and every operation, one at a time. What happens between them is the next thing to learn.

## Next steps {#next-steps}

- Read the whole document. The [Streetlights file]({{ '/assets/guides/what-is-asyncapi/streetlights-mqtt.asyncapi.yaml' | relative_url }}) is saved here as it was fetched for this guide. The original lives with the other examples in the [AsyncAPI specification's repository](https://github.com/asyncapi/spec/tree/master/examples). Find `turnOn` in it and take it apart the same way.
- Send a message yourself. The commands above work as they are, once the Mosquitto clients are installed.
- Read the rule book. The [AsyncAPI Specification](https://www.asyncapi.com/docs/reference/specification/latest) has a short Definitions section that covers the words used in this guide.
- [What Is OpenAPI?]({{ '/docs/guides/what-is-openapi/' | relative_url }}) covers HTTP APIs, where you ask and get an answer. New to APIs altogether? Start with [What Is an API?]({{ '/docs/guides/what-is-an-api/' | relative_url }})
- [API Workflows Are Still Improvised]({{ '/blog/api-workflows-are-still-improvised/' | relative_url }}) picks up where this guide stops: what happens when the order of things is written down nowhere.
- [Arazzo](https://spec.openapis.org/arazzo/latest.html) is a format for writing an API workflow down. Since version 1.1, a step in it can send or receive a message described by an AsyncAPI document. [Getting Started with UseArazzo]({{ '/docs/guides/getting-started/' | relative_url }}) shows a workflow described, checked, and run, with two HTTP calls.
