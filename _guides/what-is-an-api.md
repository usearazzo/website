---
title: "What Is an API?"
description: "An API is how one piece of software asks another for something. See what an API and a REST API are, with one real call taken apart."
summary: "What an API is, and what a REST API is, shown with one real call."
lead: "An API is how one piece of software asks another for something. This guide explains what that means, what makes an API a REST API, and takes one real call apart, piece by piece."
order: 2
date: 2026-11-13
image:
  path: /assets/images/guides/what-is-an-api.png
  webp: /assets/images/guides/what-is-an-api.webp
  width: 1200
  height: 630
  alt: "A rounded square with a command prompt on the left and a solid square with three stacked bars on the right, joined by an arrow going out and an arrow coming back, with a dashed vertical line between them"
  caption: "One program asks, the other answers, and a contract sits between them."
toc:
  - id: what-is-an-api
    title: What is an API?
  - id: why
    title: Why do APIs matter?
  - id: kinds
    title: What kinds of APIs are there?
  - id: rest
    title: What is a REST API?
  - id: a-call
    title: A REST API call, taken apart
  - id: request
    title: What is in a request?
  - id: response
    title: What is in a response?
  - id: contract
    title: An API is a contract
  - id: one-call
    title: Where one call stops
  - id: next-steps
    title: Next steps
faq:
  - question: "What does API stand for?"
    answer: |
      API stands for Application Programming Interface. "Application" is any program. "Interface" is the place where two things meet. So an API is what one program offers to other programs, the same way a screen with buttons is what it offers to people.
  - question: "How does an API work?"
    answer: |
      An API works by request and response. For an API on the web it goes in four steps:

      1. The caller sends a request: what it wants, and the details.
      2. The server checks the request and who is asking.
      3. The server does the work.
      4. The server sends back a response: a status code that says how it went, and usually some data.

      The caller never sees how the work is done. It only needs to know how to ask and what the answer will look like.
  - question: "What is an API call?"
    answer: |
      An API call is one use of an API: one question asked and one answer received. On the web that means one HTTP request and its response. Fetching the weather for one city is one call. So is reading one pet from a pet shop's API with `GET /pet/99`.
  - question: "What is an example of an API?"
    answer: |
      A weather service's API is an everyday example of an API: a weather app asks it for the forecast. Two more:

      - A web shop asks a payment provider's API to charge a card.
      - A "Sign in with Google" button asks Google's API who you are.

      APIs also exist with no network involved. When a web page asks the browser for your location, it calls one of the browser's own APIs.
  - question: "What is an API endpoint?"
    answer: |
      An API endpoint is one address an API answers at. It is usually written as a pattern, such as `/pet/{petId}`, with a placeholder for the part that changes. `/pet/99` is one URL that matches it. One API usually has many endpoints, and one endpoint can accept several methods: `GET` to read a pet, `DELETE` to remove it.
  - question: "What is the difference between an API and a website?"
    answer: |
      A website answers a person, and an API answers a program. A website returns HTML, which a browser draws on the screen. An API returns data, usually JSON, which a program reads. Both speak the same protocol, HTTP.
  - question: "What is a REST API?"
    answer: |
      A REST API is an API built on plain HTTP in a particular style. Each thing the API knows about has a URL, and the HTTP methods say what to do with it. `GET /pet/99` reads a pet, and `DELETE /pet/99` removes it. REST stands for Representational State Transfer. Many public APIs on the web follow this style, more or less strictly. GraphQL, gRPC, and SOAP are other styles for the same job.
  - question: "What is the difference between an API and a REST API?"
    answer: |
      API is the general word: any interface one piece of software offers to another. A REST API is one kind of API. It speaks HTTP, gives every resource a URL, and uses the HTTP methods to act on it. So every REST API is an API, and not every API is a REST API. A GraphQL API, a gRPC API, and the functions of a programming library are APIs too.
  - question: "What are the types of APIs?"
    answer: |
      The main types of APIs are private, partner, and public APIs, sorted by who may call them. APIs are also sorted by how they speak (REST, GraphQL, gRPC, SOAP, event-driven) and by where they run (local or remote).

      By who may call them:

      - **Private** (or internal) APIs are used inside one company.
      - **Partner** APIs are opened to chosen companies under an agreement.
      - **Public** (or open) APIs can be called by any developer, often after signing up for a key.

      The lines are not sharp. A public API may still cost money, and a private one may be reachable from the internet and simply not documented.

  - question: "What is an API key?"
    answer: |
      An API key is a secret string that tells an API who is calling. The caller sends it with every request, usually in a header. The API uses it to decide whether the call is allowed and to count how many calls that caller has made. It works like a password for a program, so keep it out of source code and public repositories.
  - question: "What is an API description?"
    answer: |
      An API description is the API's contract written down in a form a program can read. It is also called an API definition or an API specification. It lists every operation, the parameters each one takes, and the responses each one can give. For REST APIs the common format is [OpenAPI](https://spec.openapis.org/oas/latest.html). Documentation, tests, and ready-made code for calling the API can all be generated from the same description.
  - question: "What is an API workflow?"
    answer: |
      An API workflow is a sequence of API calls with a purpose: log in, then create an order, then check that it went through. It differs from a single call in what it has to carry. Something from one answer goes into the next request, each call needs a test for whether it succeeded, and the order matters. An API description covers the calls one at a time, not the sequence. [Arazzo](https://spec.openapis.org/arazzo/latest.html) is the OpenAPI Initiative's format for writing the sequence down. UseArazzo is one option for checking and running Arazzo documents, and its [getting started guide](/docs/guides/getting-started/) walks through a first one.
---

"The API is down." "It's in the API docs." "Just call the API."

If you work in software, you hear the word many times a day. Ask three colleagues what an API actually is, and you may get three answers: a server, a web address, a page of documentation. None of them is quite right.

So what is it? If you work next to APIs and want to know what is actually going on, this guide was written just for you. That means testers, technical writers, product people, and developers who are starting out.

## What is an API? {#what-is-an-api}

An API (Application Programming Interface) is the way one piece of software asks another for something. It sets what can be asked, how to ask, and what comes back.

People use software through a user interface: screens, buttons, forms. A program can't click buttons. It needs an interface of its own, with fixed questions and fixed shapes of answers. That interface is the API.

Three things make it up:

- **What you may ask.** The list of operations the other side offers: get a forecast, find a pet, place an order.
- **How to ask.** Where to send each question and what to put in it.
- **What comes back.** The shape of every answer, including the answers for when things go wrong.

Take the weather app on your phone. The phone has no weather station. The app asks a weather service for the forecast, through the service's API, and draws the answer on the screen.

Notice what is not on the list above: how the other side does its work. The weather service may run on one machine or a thousand. The app does not know and does not need to.

## Why do APIs matter? {#why}

APIs matter because they let programs use each other's work without knowing how it is done. Four things follow from that:

- **You don't build everything yourself.** The weather app does not forecast weather. A shop does not process cards. Each asks someone who does it well.
- **The inside can change.** As long as the questions and answers stay the same, the service behind them can be rewritten, moved, or grown, and no caller notices.
- **Access can be checked.** Every question comes in the same way. The API can check there who is calling and what they may do.
- **Work can be automated.** Anything a program can ask for once, it can ask for a thousand times.

## What kinds of APIs are there? {#kinds}

APIs are either local or remote. A local API is called inside one program or one machine. A remote API is called over a network.

**Some APIs are local.** "API" is a wide word, and it is older than the web. A programming language has an API: the functions it lets you call. So does every library, every operating system, and every browser. Here is an API call with no network in it at all:

```js
const pet = JSON.parse('{"name":"fido"}');
```

Your code asked the JavaScript engine to read a piece of JSON, a plain-text format for data, and turn it into an object. `JSON.parse` is the fixed question. How the engine does the work is its own business.

**Some APIs are remote.** The two sides are separate programs, usually on different machines, and they talk over a network. Most remote APIs today are **web APIs**: they travel over HTTP, the set of rules browsers and servers use to talk. The weather service is one, and the program that answers is called the server. Remote APIs come in several styles, and most of them travel over HTTP:

- **REST** uses HTTP as it was designed. HTTP's own methods, addresses, and status codes are its vocabulary.
- **GraphQL** sends one query that names exactly the fields wanted.
- **gRPC** calls remote functions in a compact binary format. It is often used between services inside a company.
- **SOAP** wraps every message in XML. It is older and still in use in many enterprise systems.
- **Event-driven APIs** turn the direction around. You don't ask. The other side tells you when something happens. A webhook works this way: you give the other side an address of yours, and it calls you.

APIs are also sorted by who may call them: private, partner, and public. The FAQ at the end has that list.

When people say "API" today, they most often mean a web API, and the style you are most likely to meet is REST. So the next sections explain REST and then follow one REST call from start to end. Keep in mind that REST is one kind of API, not the only one. The idea that comes after it, the contract, holds for every kind.

## What is a REST API? {#rest}

A REST API is an API built on plain HTTP. Each thing it knows about has a URL, and the HTTP methods say what to do with it.

REST stands for Representational State Transfer. The name comes from Roy Fielding's doctoral dissertation from 2000. A REST API borrows the habits of the web itself:

- **Everything is a resource with a URL.** In a pet shop's API a pet is a resource, and pet 99 lives at `/pet/99`.
- **The methods are the verbs.** You don't call `getPet` or `removePet`. You send `GET` or `DELETE` to the pet's URL.
- **The answer is a representation.** You don't get the pet itself. You get a description of it, usually in JSON. The same pet could be sent as XML, an older text format for data.
- **Every request stands on its own.** The server keeps the data, the pets. It does not keep track of the conversation with you. Each request carries everything needed to answer it, including who is asking. This is what "stateless" means.

Not every API that speaks HTTP is strictly REST. Fielding's rules go further than these four, and few APIs keep all of them. In everyday speech "REST API" has come to mean an HTTP API that has URLs for its resources and answers in JSON.

Now let's watch one work.

## A REST API call, taken apart {#a-call}

The [Swagger Petstore](https://petstore3.swagger.io/) is a public practice REST API for a pretend pet shop. Anyone can call it. Here we ask it for the pet with the id 99, using `curl`, a command-line tool that sends requests:

```bash
curl -i --http1.1 -H 'Accept: application/json' https://petstore3.swagger.io/api/v3/pet/99
```

The `-i` option prints the whole answer, not only its last part. The `--http1.1` option asks for the older version of HTTP, whose messages are written as text and are the easiest to read.

And here is what comes back. A few lines are left out, and the last part, which arrives as one long line, is spread out so it is easier to read:

```text
HTTP/1.1 200 OK
Date: Fri, 13 Nov 2026 19:31:37 GMT
Content-Type: application/json
Content-Length: 150
Server: Jetty(9.4.53.v20231009)

{
  "id": 99,
  "category": { "id": 101, "name": "dogz" },
  "name": "fido",
  "photoUrls": ["http://fido.jpg"],
  "tags": [{ "id": 102, "name": "friendly" }],
  "status": "available"
}
```

That is the whole thing. One program sent a **request**, the other sent back a **response**. A REST call always has these two halves.

The Petstore is open to everyone, and anyone can change its pets. If you run the commands in this guide yourself, the answers may look different.

<figure>
<div class="overflow-x-auto">
<svg viewBox="0 0 720 280" role="img" aria-labelledby="api-call-title api-call-desc" class="w-full min-w-[600px] h-auto max-w-3xl mx-auto">
<title id="api-call-title">One REST API call</title>
<desc id="api-call-desc">Your program on the left sends a request, GET /api/v3/pet/99, to the server on the right. The server sends back a response, 200 with a JSON body. A dashed line between the two marks the API, the contract between them: what you may ask, how to ask, and what comes back.</desc>
<defs><marker id="api-call-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#3A6B1F"/></marker></defs>
<g font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<rect x="20" y="70" width="170" height="120" rx="10" fill="#FFFFFF" stroke="#17210D" stroke-width="2"/>
<text x="105" y="126" text-anchor="middle" font-size="15" font-weight="700" fill="#17210D">Your program</text>
<text x="105" y="146" text-anchor="middle" font-size="12" fill="#4B5563">asks</text>
<rect x="530" y="70" width="170" height="120" rx="10" fill="#F0F5E7" stroke="#3A6B1F" stroke-width="2"/>
<text x="615" y="126" text-anchor="middle" font-size="15" font-weight="700" fill="#17210D">The server</text>
<text x="615" y="146" text-anchor="middle" font-size="12" fill="#4B5563">answers</text>
<line x1="360" y1="30" x2="360" y2="228" stroke="#6B7280" stroke-width="1.5" stroke-dasharray="5 5"/>
<text x="360" y="250" text-anchor="middle" font-size="12" font-weight="700" fill="#17210D">the API: the contract between them</text>
<text x="360" y="267" text-anchor="middle" font-size="11" fill="#4B5563">what you may ask, how to ask, what comes back</text>
<line x1="198" y1="105" x2="522" y2="105" stroke="#3A6B1F" stroke-width="2" marker-end="url(#api-call-arrow)"/>
<rect x="216" y="76" width="64" height="18" rx="3" fill="#F9FAFB"/>
<text x="218" y="89" font-size="11" fill="#4B5563">request</text>
<rect x="290" y="74" width="150" height="20" rx="3" fill="#F9FAFB"/>
<text x="365" y="89" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="12" fill="#17210D">GET /api/v3/pet/99</text>
<line x1="522" y1="155" x2="198" y2="155" stroke="#3A6B1F" stroke-width="2" marker-end="url(#api-call-arrow)"/>
<rect x="290" y="164" width="150" height="20" rx="3" fill="#F9FAFB"/>
<text x="365" y="179" text-anchor="middle" font-family="'Fira Code', Monaco, Consolas, monospace" font-size="12" fill="#17210D">200 { "name": "fido" }</text>
<rect x="450" y="166" width="64" height="18" rx="3" fill="#F9FAFB"/>
<text x="512" y="179" text-anchor="end" font-size="11" fill="#4B5563">response</text>
</g>
</svg>
</div>
</figure>

## What is in a request? {#request}

The `curl` command above hides the request behind one line. Here is what it actually sent:

```text
GET /api/v3/pet/99 HTTP/1.1
Host: petstore3.swagger.io
User-Agent: curl/8.5.0
Accept: application/json
```

A request has four parts:

- **The method** says what kind of action this is. `GET` reads something. `POST` creates, `PUT` and `PATCH` change, `DELETE` removes.
- **The URL** says what the action is about. Notice that it arrives in two pieces: the path, `/api/v3/pet/99`, on the first line, and the server in the `Host` line.
- **Headers** are the named lines that follow. They carry information about the request itself. `Accept: application/json` says: answer in JSON, please. An API key, a secret that says who is calling, travels in a header too.
- **The body** carries data to the server. Our `GET` has none. A `POST` that adds a new pet would carry the pet here.

The values that change from one request to the next are called **parameters**. Most of them sit inside the URL. The `99` in the path is a **path parameter**: the id of the pet. A **query parameter** rides after a question mark, as in `/pet/findByStatus?status=available`.

One address an API answers at is called an **endpoint**. It is usually written as a pattern with a placeholder for the parameter: `/pet/{petId}`. The `/api/v3` in front is the same for every Petstore address, so it is left out of the pattern.

## What is in a response? {#response}

A response has three parts:

- **The status code** is the short verdict. `200` means it worked.
- **Headers** describe the answer. `Content-Type: application/json` says the body is JSON.
- **The body** is the answer itself: a pet named `fido`, with the status `available`.

Status codes come in families, and the first digit names the family. These are the four you will meet:

- `2xx`: it worked.
- `3xx`: usually, look somewhere else.
- `4xx`: the request was wrong.
- `5xx`: the server failed.

Now, what if we ask for a pet that does not exist? Let's try a number nobody is likely to have used, 987654321. Again a few lines are left out:

```text
HTTP/1.1 404 Not Found
Date: Fri, 13 Nov 2026 19:51:00 GMT
Content-Type: application/json
Content-Length: 13

Pet not found
```

`404` is in the `4xx` family: the request asked for something that isn't there. A program reads that number first and only then decides what to do with the body.

Notice the `Content-Type` header on this one. We will come back to it.

## An API is a contract {#contract}

Now let's step back from REST to APIs of every kind. An API is not the software that does the work. It is the agreement about how to ask for the work: ask like this, and the answer will look like that. That agreement is a **contract**.

Take the Petstore. It's tempting to think of its API as the server. It isn't. The server is a machine that can be replaced tomorrow, and the agreement stays. For the call we made, it says something like this:

- Send `GET` to `/pet/{petId}`, where `petId` is a whole number.
- If that pet exists, the answer is `200` and the body is the pet.
- If it does not, the answer is `404`.

Look back at what happened. Pet 99 gave us a `200` and a pet. The pet that does not exist gave us a `404`. As you can see, the status codes did not surprise us. The contract said in advance what they would be.

Every API has such a contract, local ones too. For `JSON.parse` it is short: give it text that is valid JSON and you get the value back. Give it text that is not, and it throws a `SyntaxError`.

A contract can be written down, in a form that both people and programs can read. Such a document is called an **API description**. For REST APIs the common format is [OpenAPI](https://spec.openapis.org/oas/latest.html), and the Petstore publishes one.

It's important to realize what a contract does not promise:

- **That the other side is there.** The contract describes the answers. It can't make a server that is down give them.
- **That the data makes sense.** The Petstore is public, and anyone can write to it. A pet's name or category may be nonsense left over from somebody's test.
- **That everyone keeps to it.** The Petstore's written contract says our call needs proof of who is calling: an API key or a login. We sent neither and got an answer anyway. And look at the `404` again: the `Content-Type` header says JSON, and the body is plain text, so the server mislabels its own answer. Software is written by people, and people slip.
- **In what order to make the calls.** This one needs a closer look.

## Where one call stops {#one-call}

We asked for pet 99 because we already knew the number. But where would the number come from?

From another call. The Petstore can list the pets that are available. That answer is a list, and every pet in it has an id. Take one id out of the first answer, put it into the second request, and you have the pet. Two calls, with something carried from one to the next.

Real work is nearly always like this. Log in, then use the pass you got back, called a token. Create an order, then pay for it, then check that it shipped. One call rarely does a job on its own.

Remember the last thing a contract does not promise: in what order to make the calls. The Petstore's contract describes each operation, one at a time. It does not tell you to list the pets first and fetch one second. That knowledge lives somewhere else: in a script, in a wiki page, in somebody's head.

A sequence of calls with a purpose is called an **API workflow**. Listing the pets and then fetching one is a small one.

So there it is. One API call is a request, a response, and a contract that says what both look like. The contract stops at the single call. What happens between the calls is the next thing to learn.

## Next steps {#next-steps}

- Try it yourself. The [Swagger Petstore](https://petstore3.swagger.io/) page has a "Try it out" button on every operation, so you can send the calls from this guide without installing anything.
- Read a contract. The Petstore's [API description](https://petstore3.swagger.io/api/v3/openapi.json) is a small, complete one, written in OpenAPI.
- [API Workflows Are Still Improvised]({{ '/blog/api-workflows-are-still-improvised/' | relative_url }}) picks up where this guide stops: what happens when the order of the calls is written down nowhere.
- Ready to describe a sequence of calls as a document, check it, and run it? [Getting Started with UseArazzo]({{ '/docs/guides/getting-started/' | relative_url }}) does that with the two calls from the last section: list the pets, then fetch one.
