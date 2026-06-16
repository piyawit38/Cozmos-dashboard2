/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore
import compiledApp from "../dist/server.cjs";

// Handle ESM/CommonJS default export interop
const app = compiledApp && compiledApp.default ? compiledApp.default : compiledApp;

export default app;
