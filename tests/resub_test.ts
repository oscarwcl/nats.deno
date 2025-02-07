/*
 * Copyright 2021-2023 The NATS Authors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { cleanup, setup } from "./helpers/mod.ts";
import { NatsConnectionImpl } from "../nats-base-client/nats.ts";
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { createInbox, Msg } from "../nats-base-client/core.ts";

Deno.test("resub - iter", async () => {
  const { ns, nc } = await setup();
  const nci = nc as NatsConnectionImpl;
  const subja = createInbox();

  const sub = nc.subscribe(subja, { max: 2 });
  const buf: Msg[] = [];
  (async () => {
    for await (const m of sub) {
      buf.push(m);
      m.respond();
    }
  })().then();

  await nc.request(subja);

  const subjb = createInbox();
  nci._resub(sub, subjb);
  assertEquals(sub.getSubject(), subjb);

  await nc.request(subjb);

  assertEquals(sub.getProcessed(), 2);
  assertEquals(buf.length, 2);
  assertEquals(buf[0].subject, subja);
  assertEquals(buf[1].subject, subjb);
  await cleanup(ns, nc);
});

Deno.test("resub - callback", async () => {
  const { ns, nc } = await setup();
  const nci = nc as NatsConnectionImpl;
  const subja = createInbox();
  const buf: Msg[] = [];

  const sub = nc.subscribe(subja, {
    max: 2,
    callback: (_err, msg) => {
      buf.push(msg);
      msg.respond();
    },
  });

  await nc.request(subja);

  const subjb = createInbox();
  nci._resub(sub, subjb);
  assertEquals(sub.getSubject(), subjb);

  await nc.request(subjb);

  assertEquals(sub.getProcessed(), 2);
  assertEquals(buf.length, 2);
  assertEquals(buf[0].subject, subja);
  assertEquals(buf[1].subject, subjb);
  await cleanup(ns, nc);
});
