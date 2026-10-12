<script lang="ts">
  import { onMount } from "svelte";
  import { on } from "svelte/events";

  let {
    bow,
    onplaces,
  }: {
    bow: { index: number; count: number };
    onplaces: (places: Array<{ x: number; y: number }>) => void;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let isReady = $state(false);
  let start: ((index: number) => void) | null = null;

  $effect(() => {
    if (bow.count > 0) start?.(bow.index);
  });

  onMount(() => {
    const lifetime = new AbortController();
    let dispose = () => {};
    void (async () => {
      const [THREE, { cast, figure }, { createStage }] = await Promise.all([
        import("three"),
        import("@dragoman/brand/figure"),
        import("@dragoman/brand/stage"),
      ]);
      await document.fonts.load("92px 'Aref Ruqaa'");
      if (lifetime.signal.aborted || canvas == null) return;
      const element = canvas;
      const { renderer, scene, camera, resize } = createStage(element);
      const lineup = new THREE.Group();
      const pieces = Object.values(cast).map((character, index) => {
        const piece = figure(character);
        piece.position.set(
          (index - 2.5) * 0.7,
          0,
          [0.3, -0.3, -0.3, 0.3, 0.3, -0.3][index] ?? 0,
        );
        lineup.add(piece);
        return piece;
      });
      scene.add(lineup);
      const rests = pieces.map((piece) => ({
        upper: piece.upper.rotation.x,
        neck: piece.neck.rotation.x,
      }));
      const box = new THREE.Box3().setFromObject(lineup);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(-0.12, 0.16, 1).normalize();
      camera.fov = 18;

      const corners = Array.from(
        { length: 8 },
        (_, index) =>
          new THREE.Vector3(
            index & 1 ? box.max.x : box.min.x,
            index & 2 ? box.max.y : box.min.y,
            index & 4 ? box.max.z : box.min.z,
          ),
      );

      const fit = () => {
        resize();
        let span = Math.max(size.y * 1.22, (size.x * 1.08) / camera.aspect);
        const target = center.clone();
        for (let pass = 0; pass <= 4; pass++) {
          camera.position
            .copy(target)
            .addScaledVector(
              direction,
              span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
            );
          camera.lookAt(target);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld();
          if (pass === 4) break;
          const points = corners.map((corner) =>
            corner.clone().project(camera),
          );
          const top = Math.max(...points.map((point) => point.y));
          const bottom = Math.min(...points.map((point) => point.y));
          const wide = Math.max(...points.map((point) => Math.abs(point.x)));
          target.y += (((top + bottom) / 2 + 0.14) * span) / 2;
          span *= Math.max((top - bottom) / 1.52, wide / 0.94);
        }
        renderer.render(scene, camera);
        onplaces(
          pieces.map((piece) => {
            const head = new THREE.Vector3(
              piece.position.x,
              box.max.y * 1.02,
              piece.position.z,
            ).project(camera);
            return { x: (head.x + 1) / 2, y: (1 - head.y) / 2 };
          }),
        );
      };
      fit();

      const bows = pieces.map(() => Number.NEGATIVE_INFINITY);
      start = (index) => {
        bows[index] = performance.now();
      };
      const isCalm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pointer = new THREE.Vector2();
      const onPointer = (event: PointerEvent) => {
        pointer.set(
          (event.clientX / innerWidth) * 2 - 1,
          (event.clientY / innerHeight) * 2 - 1,
        );
      };
      const offPointer = on(window, "pointermove", onPointer, {
        passive: true,
      });

      const frame = (now: number) => {
        for (const [index, piece] of pieces.entries()) {
          const rest = rests[index];
          if (rest == null) continue;
          const t = (now - (bows[index] ?? 0)) / 1300;
          const amount = t > 0 && t < 1 ? Math.sin(Math.PI * t) ** 2 : 0;
          const breath = isCalm ? 0 : 0.012 * Math.sin(now / 900 + index * 1.7);
          piece.upper.rotation.x = rest.upper + breath + 0.34 * amount;
          piece.position.y =
            t > 0 && t < 0.3 ? 0.07 * Math.sin((Math.PI * t) / 0.3) : 0;
          piece.neck.rotation.x =
            rest.neck + 0.14 * amount + (isCalm ? 0 : pointer.y * 0.1);
          const turn = isCalm ? 0 : (pointer.x - piece.position.x / 3) * 0.45;
          piece.neck.rotation.y += (turn - piece.neck.rotation.y) * 0.06;
        }
        renderer.render(scene, camera);
      };

      let isVisible = true;
      const loop = () =>
        renderer.setAnimationLoop(isVisible && !document.hidden ? frame : null);
      const visibility = new IntersectionObserver(([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
        loop();
      });
      visibility.observe(element);
      const sizing = new ResizeObserver(fit);
      sizing.observe(element);
      const offVisibility = on(document, "visibilitychange", loop);
      loop();
      requestAnimationFrame(() => (isReady = true));

      dispose = () => {
        renderer.setAnimationLoop(null);
        renderer.dispose();
        visibility.disconnect();
        sizing.disconnect();
        offPointer();
        offVisibility();
      };
    })();
    return () => {
      lifetime.abort();
      dispose();
    };
  });
</script>

<div class="relative size-full">
  <div
    class="absolute inset-x-[6%] bottom-[4%] flex items-end justify-between gap-[3%] transition-opacity duration-700"
    style:opacity={isReady ? 0 : 1}
    aria-hidden="true"
  >
    {#each ["grand", "envoy", "apprentice", "scholar", "kira", "calligrapher"] as name (name)}
      <img src="/figures/{name}.webp" alt="" class="w-[15%]" />
    {/each}
  </div>
  <canvas
    bind:this={canvas}
    class="absolute inset-0 size-full transition-opacity duration-700"
    style:opacity={isReady ? 1 : 0}
    aria-hidden="true"
  ></canvas>
</div>
