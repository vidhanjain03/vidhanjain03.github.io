---
title: "Why tiny humans are hard to find in thermal images"
description: A plain-language tour of the problem I spent my M.Tech on, and why the usual detector tricks fall short.
icon: 🌡️
tags: [computer-vision, research, thermal-imaging]
---

For two years, my job was to find people in images where a person is sometimes smaller than the cursor you're reading this with. Here's why that's harder than it sounds, and what kind of ideas help.

## The setup

A drone flies over a field, a road, or a forest at night with a thermal (long-wave infrared) camera. Warm things glow; cool things don't. From high up, a standing person might cover a patch of just a few pixels. The task: draw a box around every person.

Benchmarks like TinyPerson exist precisely because this is where normal detectors fall apart.

## Why it's hard

**There's almost nothing to see.** A detector recognises a person by shape and texture: head, shoulders, legs. At a few pixels, none of that exists. You get a warm blob, and plenty of other things are warm blobs too: rocks that soaked up sunlight, car engines, animals.

**The network throws the evidence away.** Most detectors shrink the image step by step (downsampling) to build up high-level features. Each step halves the resolution. A person who was 8 pixels wide at the input is a fraction of a pixel a few layers later, and their signal gets averaged into the background.

**Contrast isn't guaranteed.** Thermal contrast depends on the temperature difference between the person and their surroundings. On a warm evening, the ground can be almost as warm as a body, and the person nearly disappears.

**It has to be light.** If the detector is going to run on the drone itself, it can't be a 200 GFLOP model. Every trick you add has to pay for itself.

## What helps

Across the four architectures in my thesis, a few ideas kept showing up:

1. **Protect the small signal early.** Refine and re-weight features in the early, high-resolution layers, before downsampling blurs the evidence away.
2. **Look at the neighbourhood.** A warm blob on a road is more likely a person than a warm blob in a parking lot full of cars. Context from the surrounding area, compared against the centre, helps separate targets from clutter.
3. **Use frequency information.** Tiny targets live in the high-frequency part of the image. Treating high and low frequencies differently helps keep them from being smoothed out.
4. **Merge scales carefully.** When features from different resolutions are combined, small misalignments hurt tiny objects most. Fusing them with care matters more than stacking more layers.

The details are in the papers on the [research page](/research/), including [TSRNet](/research/#tsrnet) and [SAPNet](/research/#sapnet).

## The part I didn't expect

The biggest lesson wasn't architectural. It was that careful evaluation matters as much as the model. On tiny-object benchmarks, small changes in how boxes are matched or which scales are counted can move numbers more than a new module does. I'll write more about that in a future post.
