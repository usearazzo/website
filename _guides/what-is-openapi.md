---
title: "What Is OpenAPI?"
description: "OpenAPI is a format for writing an HTTP API down in a file that people and programs can read. See what is in one, with a real operation taken apart."
summary: "What OpenAPI is and what an OpenAPI description holds, shown with one real operation."
lead: "OpenAPI is a format for writing an HTTP API down in a file that both people and programs can read. This guide explains what is in such a file, takes one real operation apart, and shows the limits of the format."
order: 3
date: 2026-11-19
last_modified_at: 2026-11-26
image:
  path: /assets/images/guides/what-is-openapi.png
  webp: /assets/images/guides/what-is-openapi.webp
  width: 1200
  height: 630
  alt: "A sheet of paper headed OpenAPI, with three rows of labelled lines, stands between a rounded square with a command prompt on the left and a solid square with three stacked bars on the right, joined to both by a line"
  caption: "The contract between two programs, written down."
toc:
  - id: what-is-openapi
    title: What is OpenAPI?
  - id: why
    title: Why write an API down?
  - id: inside
    title: What is in an OpenAPI description?
  - id: an-operation
    title: One operation, taken apart
  - id: uses
    title: What can you do with an OpenAPI description?
  - id: swagger
    title: What is the difference between OpenAPI and Swagger?
  - id: versions
    title: Which version of OpenAPI should you use?
  - id: limits
    title: The limits of OpenAPI
  - id: next-steps
    title: Next steps
faq:
  - question: "What does OAS stand for?"
    answer: |
      OAS stands for OpenAPI Specification. It is the full name of OpenAPI: the document that sets the rules for describing an HTTP API in a file. "OAS 3.1" means version 3.1 of those rules.
  - question: "What is an OpenAPI description?"
    answer: |
      An OpenAPI description is the full description of one API in the OpenAPI format. It lists the API's operations, the parameters each one takes, and the responses each one can give. It can be a single file or several files that point at each other with references. In everyday speech it is also called an OpenAPI definition, an OpenAPI spec, or a Swagger file.
  - question: "What is the difference between an OpenAPI description and an OpenAPI document?"
    answer: |
      An OpenAPI document is one file. An OpenAPI description is the whole: one document, or several documents connected by references. The document where a tool starts reading is the entry document, and the specification recommends naming it `openapi.json` or `openapi.yaml`. When a description is a single file, the description and the document are the same thing, which is why the two words are so often swapped.
  - question: "Is OpenAPI the same as Swagger?"
    answer: |
      Not quite. OpenAPI is the format, and Swagger was its first name. The format was called the Swagger Specification until it was donated to the OpenAPI Initiative in 2015 and renamed soon after. Today "Swagger" is the name of a family of tools that work with OpenAPI. A file with the field `swagger: "2.0"`, usually on its first line, is in the old version of the format. A file with `openapi:` there is in version 3.
  - question: "Is an OpenAPI description written in YAML or JSON?"
    answer: |
      An OpenAPI description can be written in either YAML or JSON. Both hold the same content, and a tool can turn one into the other. People who write a description by hand mostly choose YAML, because it has less punctuation. Programs often produce JSON.
  - question: "Is OpenAPI only for REST APIs?"
    answer: |
      No. OpenAPI describes any API that speaks HTTP, and a REST API is the most common kind. It fits any API made of HTTP methods, URLs, and status codes, however strictly that API follows REST. It does not describe GraphQL or gRPC APIs, which have description formats of their own. Event-driven APIs, where messages travel through a broker, have a separate format too, called [AsyncAPI](/docs/guides/what-is-asyncapi/). OpenAPI covers only the simple case, a webhook.
  - question: "Who maintains OpenAPI?"
    answer: |
      OpenAPI is maintained by the OpenAPI Initiative, an open source project under the Linux Foundation. It was formed in November 2015. The specification is developed in the open on [GitHub](https://github.com/OAI/OpenAPI-Specification), and anyone can read it and use it for free.
  - question: "What is an operationId?"
    answer: |
      An `operationId` is the name of one operation in an OpenAPI description, such as `getPetById`. It is optional. When it is there, it must be unique in the whole description. Tools use it wherever they need to point at one operation: a code generator turns it into a function name, and a workflow document uses it to say which operation a step calls.
  - question: "How does OpenAPI relate to JSON Schema?"
    answer: |
      OpenAPI uses JSON Schema to describe the shape of data. The outer layers of an OpenAPI description (paths, parameters, responses) are OpenAPI's own. The parts that say what a pet or an order looks like are schemas. Since OpenAPI 3.1 they are full JSON Schema, draft 2020-12. OpenAPI 3.0 and 2.0 each use their own cut of an older JSON Schema draft, so a schema does not always move between the versions unchanged.
  - question: "How do I check that an OpenAPI description is valid?"
    answer: |
      You check an OpenAPI description by running a validator over it. There are two levels:

      - **Is it OpenAPI at all?** A validator compares the file with the rules of the specification: the required fields are there, and every value is of the right kind.
      - **Is it good OpenAPI?** A linter applies a team's own rules on top, such as "every operation has an `operationId`".

      Most OpenAPI editors run the first check as you type. Both checks can run in a CI pipeline, the automation that checks every change to a project.

      The [SpecLynx CLI](https://speclynx.com/cli/) is one option. It needs Node.js and nothing installed up front:

      ```bash
      npx @speclynx/cli validate petstore.openapi.yaml
      ```

      For the Petstore's description from this guide it prints `No problems found`. For a file with a mistake it prints each problem with its line and ends with a failing exit code, so a CI job stops.
  - question: "Can OpenAPI describe a sequence of API calls?"
    answer: |
      No. OpenAPI describes each operation on its own, and it does not say in what order to call them. A sequence of calls with a purpose is an API workflow, and it needs a document of its own. [Arazzo](https://spec.openapis.org/arazzo/latest.html) is the OpenAPI Initiative's format for that. An Arazzo document points at the operations of an OpenAPI description and puts them in order. UseArazzo is one option for checking and running Arazzo documents, and its [getting started guide](/docs/guides/getting-started/) walks through a first one.
---

You need to call an API you have never seen before. Where do you find out what it offers?

For a long time the answer was a web page that somebody wrote by hand. A person could read it. A program could not. And nobody could tell for sure whether the page still matched the API.

So what do we do about it? We write the API down in a form that a program can read too. OpenAPI is the most common format for doing that. If you work next to APIs and keep hearing "it's in the OpenAPI" or "send me the Swagger file", this guide was written just for you.

This is the second guide in a series. The first one is [What Is an API?]({{ '/docs/guides/what-is-an-api/' | relative_url }}) Both use the same example. You don't have to read it before this one, but it helps.

## What is OpenAPI? {#what-is-openapi}

OpenAPI is a format for describing an HTTP API in plain text files. A description says what the API offers: which operations there are, what each one takes, and what each one gives back.

The full name is the **OpenAPI Specification**, OAS for short. Two things carry the name, and they are easy to mix up:

- **The specification** is the rule book. It says how to describe an API, any API. There is one, and the OpenAPI Initiative publishes it.
- **An OpenAPI description** follows those rules to describe one API. There are as many as there are APIs.

A description is plain text, written in YAML or JSON. Both are text formats for data. People can read them, and so can programs.

A small description is one file. A large one is often split into several files that point at each other with references. The specification has a word for each: one such file is an **OpenAPI document**, and the description is all of them together. The document where reading starts is called the **entry document**.

So a description and a document are not quite the same thing. In everyday speech they are mixed all the time, and you will also hear "OpenAPI definition" or just "the spec". The description in this guide is a single document, so here the two are the same file.

Here is how the specification puts its own goal. An OpenAPI description lets "both humans and computers" understand what a service can do "without requiring access to source code, additional documentation, or inspection of network traffic".

Notice the word "HTTP". OpenAPI describes APIs that are called with HTTP requests, which covers REST APIs. It does not describe every kind of API.

## Why write an API down? {#why}

Every API is a contract: ask like this, and the answer will look like that. The contract exists whether anyone writes it down or not. When nobody does, it lives in the server's code and in the heads of the people who built it.

Writing it down in one agreed format changes four things:

- **There is one place to look.** The people who build the API and the people who call it read the same file.
- **Programs can use it.** A page of prose can only be read. A description can be turned into documentation, code, and tests.
- **The API can be agreed on before it is built.** Two teams can settle the description first and then work on their two sides at the same time.
- **Changes show up.** A description is a text file. Put two versions side by side and you see what changed in the API.

## What is in an OpenAPI description? {#inside}

Let's look at a real one. The [Swagger Petstore](https://petstore3.swagger.io/) is a public practice API for a pretend pet shop, and it publishes its own OpenAPI description. The Petstore serves it as JSON and as YAML. It is shown here as YAML, which is easier on the eyes. The content is the same.

Here is the top level of the file, with nearly everything inside left out:

```yaml
openapi: 3.0.4
info:
  title: Swagger Petstore - OpenAPI 3.0
  version: 1.0.27
servers:
- url: /api/v3
paths:
  /pet/{petId}:
    get:
      # one operation: read a pet
components:
  schemas:
    Pet:
      # what a pet looks like
```

These are the five parts you will find in nearly every description:

- **`openapi`** says which version of the OpenAPI format the file is written in. Here it is 3.0.4.
- **`info`** is about the description: the API's name, and a version number of its own. Notice that these are two different version numbers. `3.0.4` is the version of the OpenAPI format. `1.0.27` is the version of this file, and its authors raise it when they change the file.
- **`servers`** says where the API lives. Every path in the file comes after this address. Here it has no host name. That means the same host the file was fetched from, `petstore3.swagger.io`.
- **`paths`** is the heart of the file. It lists the API's endpoints, the addresses it answers at, and under each one the HTTP methods it accepts. One method on one path is called an **operation**.
- **`components`** holds the pieces that are used in more than one place. Most of them are **schemas**: descriptions of what a piece of data looks like.

There are a few more parts at the top level, and not every description uses them:

- **`tags`** and **`externalDocs`** help the documentation: names for groups of operations, and a link to further reading. The Petstore's description has both.
- **`security`** says what proof of identity the whole API asks for, when it is the same for every operation.
- **`webhooks`** describes the calls that go the other way, from the API to you. It came with version 3.1.
- **`jsonSchemaDialect`** (from version 3.1) and **`$self`** (from version 3.2) are for descriptions with special needs. You can leave them alone until you meet one.

The Petstore's description has 13 paths with 19 operations, and 6 schemas. It is a small API. A large one can have hundreds of operations, and it is still built from the same parts.

## One operation, taken apart {#an-operation}

The [What Is an API?]({{ '/docs/guides/what-is-an-api/' | relative_url }}) guide took one call apart. It was a `GET` request to `/api/v3/pet/99`, answered with `200` and a pet named `fido`. Now let's find that call in the description.

Here is the operation, as the Petstore describes it. Two parts are left out: a label that groups operations on the documentation page, and a second answer format, XML.

```yaml
paths:
  /pet/{petId}:
    get:
      summary: Find pet by ID.
      description: Returns a single pet.
      operationId: getPetById
      parameters:
      - name: petId
        in: path
        description: ID of pet to return
        required: true
        schema:
          type: integer
          format: int64
      responses:
        '200':
          description: successful operation
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
        '400':
          description: Invalid ID supplied
        '404':
          description: Pet not found
        default:
          description: Unexpected error
      security:
      - api_key: []
      - petstore_auth:
        - write:pets
        - read:pets
```

What is happening here? Let's go through it from the top.

- **The path and the method.** `/pet/{petId}` is the endpoint and `get` is the method. Put the `servers` address in front, fill in the placeholder `{petId}`, and you have the request we sent: `GET /api/v3/pet/99`.
- **`operationId`** gives the operation a name, `getPetById`. The call itself never carries this name. It is there so that tools and other documents can point at this exact operation.
- **`parameters`** lists what changes from one request to the next. There is one: `petId`. It travels `in: path`, it is `required`, and it must be an `integer`. The `format: int64` line adds that the number may be a very large one. Our `99` was that parameter.
- **`responses`** lists the answers the operation can give, by status code. For each one it can say what the body looks like. `'400'` is the answer to an id that is not a number. `default` covers every status code that is not listed.
- **`security`** says the caller must prove who is calling: with an API key, or with a login.

The `200` response does not describe a pet on the spot. It points at one with `$ref`, a reference. This one leads to another place in the same file, and a reference can also lead into a different file. Here is what it points at, with a few lines that only matter for XML left out:

```yaml
components:
  schemas:
    Pet:
      required:
      - name
      - photoUrls
      type: object
      properties:
        id:
          type: integer
          format: int64
          example: 10
        name:
          type: string
          example: doggie
        category:
          $ref: '#/components/schemas/Category'
        photoUrls:
          type: array
          items:
            type: string
        tags:
          type: array
          items:
            $ref: '#/components/schemas/Tag'
        status:
          type: string
          description: pet status in the store
          enum:
          - available
          - pending
          - sold
```

This is a **schema**. It says a pet is an object with six properties, that `name` and `photoUrls` must always be there, and that `status` is one of three words. The pet we got back had the name `fido` and the status `available`. It fits.

So every piece of the call has its place in the description:

| The call | In the description |
| --- | --- |
| `GET` | the `get` under the path |
| `/api/v3` | `servers` |
| `/pet/99` | the path `/pet/{petId}` |
| `99` | the parameter `petId`: in the path, an integer |
| `200` | the response `'200'` |
| The JSON body | `application/json`, and the `Pet` schema |
| `404` for a pet that does not exist | the response `'404'` |

In the [What Is an API?]({{ '/docs/guides/what-is-an-api/' | relative_url }}) guide we wrote this contract down by hand, in three lines of plain English. Well, here are the same three lines, in a form a program can read.

Notice one more thing. The `404` response has a description and nothing else. The file does not say what the body of that answer looks like. A caller can count on the number, and on nothing more.

## What can you do with an OpenAPI description? {#uses}

One file, once written, feeds many tools. These are the common uses:

- **Documentation.** A tool turns the description into a web page with every operation on it. The [Petstore's own page](https://petstore3.swagger.io/) is made this way, from the file we just read.
- **Code for calling the API.** A generator writes a client library: one function for each operation, in the language you choose.
- **A skeleton of the server.** A generator writes the outline of the server too, and leaves the real work to be filled in.
- **A mock server.** A tool reads the description and answers with made-up data in the right shape. The callers can start their work before the real API exists.
- **Tests.** A tool sends requests and checks that each real answer matches the description.
- **Review.** A linter checks the description against a team's own rules. Another tool compares two versions and reports the changes that would break a caller.
- **AI agents.** An agent can read the description to learn which operations exist and what each one needs.

The community keeps a long list of such tools at [openapi.tools](https://openapi.tools/).

Notice that all of them depend on the same thing: the description has to be right. A tool trusts the file. It has no other way to know the API.

## What is the difference between OpenAPI and Swagger? {#swagger}

OpenAPI is the format. Swagger was the format's first name, and today it is the name of a family of tools that work with it.

Here is how that came about:

- **2011.** The first version of the format is released, as the Swagger Specification.
- **2014.** Swagger 2.0 is released. It becomes widely used.
- **2015.** The specification is donated to the OpenAPI Initiative, a new open source project under the Linux Foundation. It is renamed the OpenAPI Specification soon after.
- **2017.** OpenAPI 3.0 is released, the first version made under the new name.

So Swagger 2.0 and OpenAPI 2.0 are the same format under two names. From version 3.0 on, there is only OpenAPI.

The name Swagger stayed with the tools that grew up around the format. That is why the practice API in this guide is called the Swagger Petstore, although its description is written in OpenAPI.

You can tell the two apart by one field, usually the first line of the file:

```yaml
swagger: "2.0"
```

This is the old format. A file in version 3 has `openapi:` and the version number there.

People still say "the Swagger file" or "the Swagger" when they mean an OpenAPI description. Now you know what they mean.

## Which version of OpenAPI should you use? {#versions}

There are four versions you may meet:

| Version | Released | What it brought |
| --- | --- | --- |
| 2.0 | 2014, as Swagger 2.0 | The version that made the format widely used. Still found in older APIs. |
| 3.0 | 2017 | `components` for shared pieces, `requestBody`, more than one server, callbacks, and links. |
| 3.1 | 2021 | Schemas are full JSON Schema. Webhooks can be described. |
| 3.2 | 2025 | The `QUERY` method and other methods beyond the usual ones. Answers that arrive as a stream. |

A version number has three parts, as in the Petstore's `3.0.4`. The first two name the set of features. The third only marks corrections to the text of the specification, and tools are told to ignore it.

So which one do you choose?

- **For a new description**, take the newest version that all your tools support. Check the tools first. Support for a new version arrives in each tool at its own pace.
- **For an existing description**, there is no need to hurry. A 3.0 description is still a good description. The Petstore's is one.
- **For a 2.0 description**, moving to version 3 is worth planning. The top of the file is laid out differently, so the move is a conversion, and there are tools that do it.

## The limits of OpenAPI {#limits}

A description is the contract written down. It's important to realize what writing it down does not do.

**It does not make the server keep to it.** Look at the `security` lines of our operation again. They say the call needs an API key or a login. In the [What Is an API?]({{ '/docs/guides/what-is-an-api/' | relative_url }}) guide we sent neither, and the Petstore answered anyway. The description says one thing and the server does another. Nothing in the file can prevent that. Only testing the server against the description can find it.

**It does not describe every API.** OpenAPI is for HTTP APIs. GraphQL and gRPC have their own formats. Event-driven APIs, where messages travel through a broker, have one too, called AsyncAPI. The [What Is AsyncAPI?]({{ '/docs/guides/what-is-asyncapi/' | relative_url }}) guide takes one such message apart. OpenAPI covers only the simple case, a webhook.

**It does not say in what order to make the calls.** This one needs a closer look.

We asked for pet 99 because we already knew the number. Where would the number come from? From another operation, `findPetsByStatus`, which lists pets and their ids. Both operations are in the Petstore's description, each one described with care. But nothing in the file says: call this one first, take an id out of the answer, and put it into that one.

OpenAPI has one feature that comes close, called **links**. A link says that a value in one operation's response can be used as a parameter of another operation. That is a hint about two operations. It is not a sequence with a purpose: it has no list of steps and no test for whether a step worked. The Petstore's description does not use links at all.

So the order of the calls is still written down nowhere. It lives in a script, in a wiki page, in somebody's head.

OpenAPI does leave one hook for it, and we have already seen it: `operationId`. Every operation can have a name. A document that describes a sequence of calls does not have to repeat the paths and the parameters. It can name the operations, `findPetsByStatus` and then `getPetById`, and say what is carried from one to the next.

A sequence of calls with a purpose is called an **API workflow**.

So there it is. OpenAPI is the contract of an API, written down so that people and programs can both read it. It describes every operation, one at a time. What happens between the operations is the next thing to learn.

## Next steps {#next-steps}

- Read the whole description. The Petstore's file as it was captured for this guide is here as [YAML]({{ '/assets/guides/what-is-openapi/petstore.openapi.yaml' | relative_url }}) and as [JSON]({{ '/assets/guides/what-is-openapi/petstore.openapi.json' | relative_url }}). Find `findPetsByStatus` in it and take it apart the same way.
- See it at work. The [Swagger Petstore](https://petstore3.swagger.io/) page is that same file turned into documentation, with a "Try it out" button on every operation.
- Read the rule book. The [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) is long, but it's written to be read.
- Not every API waits to be asked. [What Is AsyncAPI?]({{ '/docs/guides/what-is-asyncapi/' | relative_url }}) covers the format for APIs that send messages.
- New to APIs? [What Is an API?]({{ '/docs/guides/what-is-an-api/' | relative_url }}) explains the request, the response, and the contract this guide builds on.
- [API Workflows Are Still Improvised]({{ '/blog/api-workflows-are-still-improvised/' | relative_url }}) picks up where this guide stops: what happens when the order of the calls is written down nowhere.
- Ready to describe a sequence of calls as a document, check it, and run it? [Getting Started with UseArazzo]({{ '/docs/guides/getting-started/' | relative_url }}) does that with the two operations named above: `findPetsByStatus`, then `getPetById`.
