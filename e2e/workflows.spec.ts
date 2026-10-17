import { expect, test, type Page } from "@playwright/test";

/**
 * The workflows users touch most: creating, editing, saving, importing,
 * exporting, and resetting. Everything runs against a real browser with
 * real local storage.
 */

const storageKey = "flowai:workflows";

async function openWorkflowsPage(page: Page) {
  await page.goto("/workflows");
}

async function createWorkflow(page: Page) {
  await openWorkflowsPage(page);

  /**
   * The empty state repeats the create button, so the first one is used.
   */
  await page.getByRole("button", { name: /new workflow/i }).first().click();
  await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);
  await dismissTour(page);
}

/**
 * The first run shows a modal tour that covers the editor, so anything
 * driving the canvas has to dismiss it first.
 */
async function dismissTour(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Product tour" });
  const skip = page.getByRole("button", { name: /^Skip the tour$/ });

  /**
   * The tour opens a tick after the editor loads.
   */
  await dialog
    .waitFor({ state: "visible", timeout: 3000 })
    .catch(() => undefined);

  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(dialog).toBeHidden();
  }
}

async function useTemplate(page: Page) {
  await page.goto("/templates");
  await page.getByRole("button", { name: /use this template/i }).first().click();
  await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);
  await dismissTour(page);
}

/**
 * Writes a workflow straight to storage, for the cases a template can't
 * produce: an exact shape, or a run that takes a known amount of time.
 */
async function seedWorkflow(page: Page, workflow: Record<string, unknown>) {
  const now = new Date().toISOString();

  await page.evaluate(
    ({ key, envelope }) => window.localStorage.setItem(key, JSON.stringify(envelope)),
    {
      key: storageKey,
      envelope: {
        version: 2,
        savedAt: now,
        workflows: [
          {
            description: "",
            status: "draft",
            createdAt: now,
            updatedAt: now,
            ...workflow,
          },
        ],
      },
    },
  );
}

test.beforeEach(async ({ page }) => {
  /**
   * Cleared once per test, not on every navigation, so a reload keeps
   * whatever the test saved.
   */
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test.describe("creating", () => {
  test("creates an empty workflow and opens the editor", async ({ page }) => {
    await createWorkflow(page);

    await expect(page.getByRole("button", { name: /inspector/i }).first()).toBeVisible();
    await expect(page.getByText("Empty canvas")).toBeVisible();
  });

  test("adds a node by clicking it in the library", async ({ page }) => {
    await createWorkflow(page);

    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    await expect(page.getByText("No node selected")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Manual Trigger" })).toBeVisible();
  });

  test("shows the tour on a first run", async ({ page }) => {
    await page.goto("/workflows");
    await page.getByRole("button", { name: /new workflow/i }).first().click();

    await expect(page.getByRole("dialog", { name: "Product tour" })).toBeVisible();
    await expect(page.getByText("Welcome to FlowAI")).toBeVisible();

    await page.getByRole("button", { name: /^Skip the tour$/ }).click();
    await expect(page.getByRole("dialog", { name: "Product tour" })).toBeHidden();
  });

  test("does not show the tour again once it is dismissed", async ({ page }) => {
    await page.goto("/workflows");
    await page.getByRole("button", { name: /new workflow/i }).first().click();
    await page.getByRole("button", { name: /^Skip the tour$/ }).click();

    await page.reload();

    await expect(page.getByRole("dialog", { name: "Product tour" })).toBeHidden();
  });

  test("starts from a template", async ({ page }) => {
    await openWorkflowsPage(page);
    await page.getByRole("button", { name: /use this template/i }).first().click();

    await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Empty canvas")).toBeHidden();
  });
});

test.describe("saving", () => {
  test("keeps a workflow across a reload", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    const url = page.url();
    await page.reload();

    expect(page.url()).toBe(url);

    /**
     * The node survives, while the selection is session state and is
     * expected to reset.
     */
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.getByText("No node selected")).toBeVisible();

    await openWorkflowsPage(page);
    await expect(page.getByText("1 node")).toBeVisible();
  });

  test("lists the saved workflow on the workflows page", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await openWorkflowsPage(page);

    await expect(page.getByRole("heading", { name: "Untitled Workflow" })).toBeVisible();
  });

  test("saves automatically while editing", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    await openWorkflowsPage(page);

    await expect(page.getByRole("heading", { name: "Untitled Workflow" })).toBeVisible();
    await expect(page.getByText("1 node")).toBeVisible();
  });
});

test.describe("running", () => {
  test("dry runs a workflow built from a template", async ({ page }) => {
    await useTemplate(page);

    await page.getByRole("button", { name: "Dry run workflow" }).click();

    await expect(page.getByText(/dry run/)).toBeVisible();
    await expect(page.getByText("Workflow Execution").first()).toBeVisible();
  });

  test("cannot run a workflow that is missing a trigger", async ({ page }) => {
    await createWorkflow(page);

    await expect(page.getByRole("button", { name: "Run Workflow", exact: true })).toBeDisabled();
  });
});

test.describe("exporting", () => {
  test("downloads the workflow as json", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export workflow" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("Untitled-Workflow.json");

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    expect(exported.name).toBe("Untitled Workflow");
    expect(exported.nodes).toHaveLength(1);
  });
});

test.describe("importing", () => {
  const exportedWorkflow = {
    id: "imported-1",
    name: "Imported workflow",
    description: "",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes: [
      {
        id: "n1",
        type: "manual-trigger",
        position: { x: 0, y: 0 },
        data: {
          label: "Manual Trigger",
          description: "Start workflow manually",
          category: "trigger",
          config: {},
        },
      },
    ],
    edges: [],
  };

  test("imports a valid workflow", async ({ page }) => {
    await createWorkflow(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "flow.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exportedWorkflow)),
    });

    /**
     * The name lives in the header input rather than a heading.
     */
    await expect(page.locator("input").first()).toHaveValue("Imported workflow");
  });

  test("shows an error for malformed json", async ({ page }) => {
    await createWorkflow(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{ this is not json"),
    });

    await expect(page.getByText(/Expected property name|JSON/i).first()).toBeVisible();
    await expect(page.locator("input").first()).toHaveValue("Untitled Workflow");
  });

  test("shows an error for json that is not a workflow", async ({ page }) => {
    await createWorkflow(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "wrong.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ hello: "world" })),
    });

    await expect(page.getByText(/not a valid FlowAI workflow/i)).toBeVisible();
    await expect(page.locator("input").first()).toHaveValue("Untitled Workflow");
  });
});

test.describe("resetting", () => {
  test("clears every stored workflow", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    await page.goto("/settings");
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /reset|delete/i }).click();

    await openWorkflowsPage(page);

    await expect(page.getByText("No workflows yet")).toBeVisible();
    await expect(page.getByText(storageKey)).toBeHidden();
  });

  test("keeps the data when the confirmation is declined", async ({ page }) => {
    await createWorkflow(page);

    await page.goto("/settings");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: /reset|delete/i }).click();

    await openWorkflowsPage(page);

    await expect(page.getByRole("heading", { name: "Untitled Workflow" })).toBeVisible();
  });
});

test.describe("corrupted storage", () => {
  /**
   * Corruption is written through `evaluate` rather than an init script,
   * so it happens once instead of on every navigation.
   */
  async function corrupt(page: Page, value: string) {
    await openWorkflowsPage(page);
    await page.evaluate((raw) => window.localStorage.setItem("flowai:workflows", raw), value);
    await page.reload();
  }

  test("recovers from malformed local storage", async ({ page }) => {
    await corrupt(page, "{ this is broken");

    await expect(page.getByText("No workflows yet")).toBeVisible();

    await page.goto("/settings");
    await expect(page.getByText(/repaired|recovered|recover/i)).toBeVisible();
  });

  test("recovers from a truncated workflow entry", async ({ page }) => {
    await corrupt(
      page,
      JSON.stringify({
        version: 2,
        savedAt: new Date().toISOString(),
        workflows: [{ id: "broken" }, null, "nope"],
      }),
    );

    await expect(page.getByText("No workflows yet")).toBeVisible();
  });

  test("recovers from a legacy bare array", async ({ page }) => {
    await corrupt(
      page,
      JSON.stringify([
        {
          id: "legacy-1",
          name: "Legacy workflow",
          description: "",
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nodes: [],
          edges: [],
        },
      ]),
    );

    await expect(page.getByRole("heading", { name: "Legacy workflow" })).toBeVisible();
  });

  test("keeps working after corrupted data is replaced", async ({ page }) => {
    await corrupt(page, "[[[");

    await page.getByRole("button", { name: /new workflow/i }).first().click();
    await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);

    await openWorkflowsPage(page);

    await expect(page.getByRole("heading", { name: "Untitled Workflow" })).toBeVisible();
  });
});

test.describe("variables panel", () => {
  test("lists the variables a workflow exposes", async ({ page }) => {
    await useTemplate(page);

    await page.getByRole("button", { name: /variables/i }).first().click();

    await expect(page.getByText("Workflow Variables")).toBeVisible();
    await expect(page.getByText(/outputs · .* references/)).toBeVisible();
  });
});

test.describe("graph edges", () => {
  test("draws an arrowhead on every connection", async ({ page }) => {
    await useTemplate(page);

    const edges = page.locator(".react-flow__edge");
    const count = await edges.count();

    expect(count).toBeGreaterThan(0);

    /**
     * `marker-end` is how direction becomes visible, so an edge without
     * it points nowhere.
     */
    for (let index = 0; index < count; index += 1) {
      await expect(edges.nth(index).locator(".react-flow__edge-path")).toHaveAttribute(
        "marker-end",
        /url\(/,
      );
    }
  });

  test("labels the branches of a condition", async ({ page }) => {
    await page.goto("/templates");
    await page
      .getByRole("button", { name: /use this template/i })
      .nth(2)
      .click();
    await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);
    await dismissTour(page);

    await expect(page.getByText("True", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("False", { exact: true }).first()).toBeVisible();

    /**
     * The branch colour travels from the node handle to the edge.
     */
    const trueEdge = page
      .locator(".react-flow__edge")
      .filter({ hasText: "True" })
      .first();

    await expect(trueEdge.locator(".react-flow__edge-path")).toHaveCSS(
      "stroke",
      "rgb(52, 211, 153)",
    );
  });

  test("animates the edges of a running node", async ({ page }) => {
    /**
     * A delay keeps a node running for long enough to observe, which a
     * template's instant nodes can't guarantee.
     */
    await seedWorkflow(page, {
      id: "slow-workflow",
      name: "Slow workflow",
      nodes: [
        {
          id: "trigger-1",
          type: "manual-trigger",
          position: { x: 0, y: 0 },
          data: {
            label: "Manual Trigger",
            description: "Start workflow manually",
            category: "trigger",
            config: {},
          },
        },
        {
          id: "delay-1",
          type: "delay",
          position: { x: 320, y: 0 },
          data: {
            label: "Delay",
            description: "Wait before continuing",
            category: "action",
            config: { durationMs: 3000 },
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "trigger-1",
          target: "delay-1",
        },
      ],
    });

    await page.goto("/workflows/slow-workflow");
    await dismissTour(page);

    await page.getByRole("button", { name: "Run Workflow", exact: true }).click();

    await expect(page.locator(".react-flow__edge.animated").first()).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole("button", { name: /stop|cancel/i }).first().click();
  });

  test("deletes a connection when it is selected", async ({ page }) => {
    await useTemplate(page);

    const edges = page.locator(".react-flow__edge");
    const before = await edges.count();

    /**
     * Dispatched on the edge itself: a connection is a thin curve, and
     * the centre of its bounding box is often empty canvas.
     */
    await edges.first().locator(".react-flow__edge-path").dispatchEvent("click");

    await expect(edges.first()).toHaveClass(/selected/);

    await page.keyboard.press("Delete");

    await expect(edges).toHaveCount(before - 1);
  });
});

test.describe("canvas", () => {
  test("drops a node on a grid", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    const node = page.locator(".react-flow__node").first();
    const box = await node.boundingBox();

    /**
     * A deliberately unaligned drag: if the canvas didn't snap, this
     * would land between grid lines.
     */
    await page.mouse.move(box!.x + 40, box!.y + 20);
    await page.mouse.down();
    await page.mouse.move(box!.x + 173, box!.y + 119, { steps: 10 });
    await page.mouse.up();

    const transform = await node.evaluate(
      (element) => (element as HTMLElement).style.transform,
    );

    const [, x, y] = transform.match(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/) ?? [];

    expect(Number(x) % 16).toBe(0);
    expect(Number(y) % 16).toBe(0);
  });

  test("undoes a whole drag in one step", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    const node = page.locator(".react-flow__node").first();
    const before = await node.evaluate(
      (element) => (element as HTMLElement).style.transform,
    );

    const box = await node.boundingBox();

    await page.mouse.move(box!.x + 40, box!.y + 20);
    await page.mouse.down();
    await page.mouse.move(box!.x + 340, box!.y + 220, { steps: 25 });
    await page.mouse.up();

    await page.keyboard.press("Control+z");

    /**
     * The drag reports a change for every step it travels, and all of
     * them have to collapse into the one undo step.
     */
    await expect
      .poll(async () =>
        node.evaluate((element) => (element as HTMLElement).style.transform),
      )
      .toBe(before);
  });

  test("pans with space held down, even from over a node", async ({ page }) => {
    await createWorkflow(page);
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    const node = page.locator(".react-flow__node").first();
    const viewport = page.locator(".react-flow__viewport");

    const positionBefore = await node.evaluate(
      (element) => (element as HTMLElement).style.transform,
    );

    const viewportBefore = await viewport.evaluate(
      (element) => (element as HTMLElement).style.transform,
    );

    const box = await node.boundingBox();

    await page.keyboard.down("Space");
    await page.mouse.move(box!.x + 40, box!.y + 20);
    await page.mouse.down();
    await page.mouse.move(box!.x + 240, box!.y + 160, { steps: 12 });
    await page.mouse.up();
    await page.keyboard.up("Space");

    /**
     * The canvas moved, the node stayed where it was, and the gesture
     * didn't change what is selected.
     */
    expect(
      await viewport.evaluate(
        (element) => (element as HTMLElement).style.transform,
      ),
    ).not.toBe(viewportBefore);

    expect(
      await node.evaluate((element) => (element as HTMLElement).style.transform),
    ).toBe(positionBefore);

    await expect(
      page.getByRole("heading", { name: "Manual Trigger" }),
    ).toBeVisible();
  });

  test("sends both condition branches out of the right side", async ({ page }) => {
    await page.goto("/templates");
    await page
      .getByRole("button", { name: /use this template/i })
      .nth(2)
      .click();
    await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);
    await dismissTour(page);

    const condition = page
      .locator(".react-flow__node")
      .filter({ hasText: "Score above" })
      .first();

    const nodeBox = await condition.boundingBox();

    for (const branch of ["True", "False"]) {
      const handle = condition
        .locator(`.react-flow__handle[data-handleid="${branch.toLowerCase()}"]`)
        .first();

      const handleBox = await handle.boundingBox();

      /**
       * A branch that leaves to the left sends the edge back across the
       * node it came from.
       */
      expect(handleBox!.x).toBeGreaterThan(nodeBox!.x + nodeBox!.width / 2);
    }

    expect(
      await condition
        .locator('.react-flow__handle[data-handleid="false"]')
        .first()
        .boundingBox()
        .then((box) => box!.y),
    ).toBeGreaterThan(
      await condition
        .locator('.react-flow__handle[data-handleid="true"]')
        .first()
        .boundingBox()
        .then((box) => box!.y),
    );
  });
});

test.describe("sidebar", () => {
  test("collapses, remembers the choice, and stops covering the content", async ({
    page,
  }) => {
    await openWorkflowsPage(page);

    const sidebar = page.locator("aside").first();
    const content = page.locator(".app-content");

    const width = async () =>
      Math.round((await sidebar.boundingBox())!.width);

    const padding = async () =>
      Math.round(
        Number.parseFloat(
          await content.evaluate(
            (element) => getComputedStyle(element).paddingLeft,
          ),
        ),
      );

    const collapsedWidth = await width();

    await page.getByRole("button", { name: "Expand sidebar" }).click();

    expect(collapsedWidth).toBeLessThan(256);

    /**
     * The content has to move by exactly what the sidebar gained, which
     * is what the shared width variable is for. Polled because the width
     * animates, and the two only agree once it settles.
     */
    await expect.poll(async () => (await width()) - (await padding())).toBe(0);

    await expect.poll(width).toBe(256);

    await page.reload();

    expect(await width()).toBe(256);
  });

  test("keeps the mobile menu button in the bar it opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await openWorkflowsPage(page);

    const button = page.getByRole("button", { name: "Open navigation" });
    const header = page.locator("header");

    const headerBox = (await header.boundingBox())!;
    const buttonBox = (await button.boundingBox())!;

    /**
     * It used to be fixed to the corner with the header padded aside for
     * it, which broke the moment either of them moved.
     */
    expect(buttonBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(buttonBox.x).toBeGreaterThanOrEqual(headerBox.x);

    await button.click();
    await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();
  });
});

test.describe("command palette", () => {
  test("opens with the keyboard and finds a saved workflow", async ({ page }) => {
    await openWorkflowsPage(page);
    await page.getByRole("button", { name: /new workflow/i }).first().click();
    await expect(page).toHaveURL(/\/workflows\/[0-9a-f-]{36}$/);
    await dismissTour(page);

    const name = page.locator("input").first();
    await name.fill("Quarterly report");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    await openWorkflowsPage(page);
    await page.keyboard.press("Control+k");

    const input = page.getByRole("combobox", { name: /search commands/i });

    await expect(input).toBeVisible();
    await input.fill("quarterly");

    await page.getByRole("option", { name: /quarterly report/i }).click();

    await expect(page.locator("input").first()).toHaveValue("Quarterly report");
  });

  test("adds a node from inside the editor", async ({ page }) => {
    await createWorkflow(page);

    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: /search commands/i }).fill("delay");

    await page.getByRole("option", { name: /add delay/i }).click();

    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Delay" }),
    ).toBeVisible();
  });

  test("leaves editor commands out when there is no editor", async ({ page }) => {
    await openWorkflowsPage(page);

    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: /search commands/i }).fill("add delay");

    await expect(page.getByText(/nothing matches/i)).toBeVisible();
  });

  test("closes on Escape and reopens on the same key", async ({ page }) => {
    await openWorkflowsPage(page);

    await page.keyboard.press("Control+k");
    await expect(page.getByRole("combobox")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox")).toBeHidden();

    await page.keyboard.press("Control+k");
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("runs the workflow from the palette", async ({ page }) => {
    await useTemplate(page);

    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: /search commands/i }).fill("dry run");

    await page.getByRole("option", { name: /dry run workflow/i }).click();

    await expect(page.getByText("Workflow Execution").first()).toBeVisible();
  });
});

test.describe("theme", () => {
  test("switches between light and dark and remembers the choice", async ({
    page,
  }) => {
    /**
     * The system preference decides what "system" resolves to, so it is
     * pinned to keep the test deterministic.
     */
    await page.emulateMedia({ colorScheme: "dark" });

    await openWorkflowsPage(page);

    const toggle = page.getByRole("button", { name: /^Theme:/ });

    const initial = await page.locator("html").getAttribute("data-theme");

    expect(initial).toBe("dark");

    await toggle.click();

    expect(await page.locator("html").getAttribute("data-theme")).toBe("light");

    await page.reload();

    expect(await page.locator("html").getAttribute("data-theme")).toBe("light");
  });
});

test.describe("keyboard shortcuts", () => {
  test("lists the shortcuts from the topbar", async ({ page }) => {
    await openWorkflowsPage(page);

    await page.getByRole("button", { name: /keyboard shortcuts/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Undo the last change")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("opens with the question mark key", async ({ page }) => {
    await openWorkflowsPage(page);

    /**
     * The shortcut is registered while the page hydrates, so a key
     * pressed a moment too early is simply lost. Retrying presses it
     * again rather than assuming the first one landed.
     */
    await expect
      .poll(async () => {
        await page.keyboard.press("?");
        return page.getByRole("dialog").isVisible();
      })
      .toBe(true);
  });

  test("duplicates and removes a node with the keyboard", async ({ page }) => {
    await createWorkflow(page);

    await page.getByRole("button", { name: /Manual Trigger/ }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);

    await page.keyboard.press("Control+d");
    await expect(page.locator(".react-flow__node")).toHaveCount(2);

    await page.keyboard.press("Delete");
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
  });

  test("does not steal keys while typing", async ({ page }) => {
    await createWorkflow(page);

    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    const name = page.locator("input").first();
    await name.fill("Typed by keyboard");

    /**
     * The duplicate shortcut must not fire while the field has focus.
     */
    await name.press("Control+d");

    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(name).toHaveValue("Typed by keyboard");
  });
});

test.describe("mobile editor", () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test("opens and closes the node library", async ({ page }) => {
    await createWorkflow(page);

    await page.getByRole("button", { name: "Toggle node library" }).click();

    await expect(page.getByRole("heading", { name: "Node Library" })).toBeVisible();

    await page.getByRole("button", { name: "Close node library" }).first().click();

    await expect(page.getByRole("heading", { name: "Node Library" })).toBeHidden();
  });

  test("opens the inspector as a full width panel", async ({ page }) => {
    await createWorkflow(page);

    await page.getByRole("button", { name: "Toggle node inspector" }).click();

    const panel = page.locator("aside").last();
    const box = await panel.boundingBox();

    expect(box?.width).toBeGreaterThan(300);
  });

  test("adds a node from the library on a touch sized screen", async ({ page }) => {
    await createWorkflow(page);

    await page.getByRole("button", { name: "Toggle node library" }).click();
    await page.getByRole("button", { name: /Manual Trigger/ }).click();

    await expect(page.locator(".react-flow__node")).toHaveCount(1);
  });
});

test.describe("execution dock", () => {
  test("stays out of the way until a run happens", async ({ page }) => {
    await createWorkflow(page);

    await expect(page.getByText("Workflow Execution")).toBeHidden();

    await useTemplate(page);
    await page.getByRole("button", { name: "Dry run workflow" }).click();

    await expect(page.getByText("Workflow Execution").first()).toBeVisible();

    await page.getByRole("button", { name: "Hide execution details" }).click();

    await expect(page.getByRole("button", { name: "Show execution details" })).toBeVisible();
  });
});

test.describe("missing workflows", () => {
  test("explains that the workflow is gone", async ({ page }) => {
    await page.goto("/workflows/00000000-0000-0000-0000-000000000000");

    await expect(page.getByText("Workflow not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /back to workflows/i })).toBeVisible();
  });

  test("recovers after following the link back", async ({ page }) => {
    await page.goto("/workflows/00000000-0000-0000-0000-000000000000");

    await page.getByRole("link", { name: /back to workflows/i }).click();

    await expect(page).toHaveURL(/\/workflows$/);
  });
});