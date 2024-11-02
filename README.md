## The Spirit

![](https://raw.githubusercontent.com/edankwan/The-Spirit/master/app/images/screenshot.jpg)

[Live demo](http://www.edankwan.com/experiments/the-spirit/) | [Video](https://www.youtube.com/watch?v=lcHAtTGzQE8)

**The Spirit** is a WebGL experience by Edan Kwan. It uses the noise derivatives and curl noise to create that smoky look and feel. It also uses the **[the new particles](http://www.simppa.fi/blog/the-new-particle/)** which invented by Simo Santavirta [@simppafi](https://twitter.com/simppafi)

This experiment is also inspired by [David Li](http://david.li/)'s [Flow](http://david.li/flow/) experiment.

## Development and deployment
- dev: `node dev` 
- deploy: `node build`

## Usage
**Vue Example:**
```vue
<template>
  <div ref="container"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import spiritWebgl from 'the-spirit-webgl2'
const container = ref(null)

onMounted(() => {
  if (container.value) {
    spiritWebgl.init(container.value)
  }
})
</script>
```

## License
This experiment is under MIT License.

