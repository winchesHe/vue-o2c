# vue-o2c - Vue Options API to Composition API

**Started by @winches/ts-start**

**[Power by vue-o2c](https://github.com/tjk/vue-o2c/blob/master/README.md)**

**[Demo / Online Playground](https://tjk.github.io/vue-o2c/)**

**WORK IN PROGRESS** -- the following is not done:

- bunch of stuff still not implemented (working through case by case)
- publish package correctly for CLI command to work (need to check)
- data() preamble -- if there is preamble maybe just create refs then use the function to set them
- handle setup() in options api
- allow options to configure (eg. no typescript)
- $el needs to try to rewrite part of template
- would like to maintain indentation

**After running, check for FIXME comments**

Composition API does not allow easy access of `app.config.globalProperties` like options API does.
vue-o2c takes care of some basic cases (eg. `this.$router` assuming vue-router) but for others, you will
see comments like the following and you must adjust the code depending on how you provide these systems.

```typescript
const $primevue = inject("primevue") /* FIXME vue-o2c */
```

## Usage

### via CLI

*This is not working due to a publishing issue I need to fix...*

```bash
$ npx @winches/vue-o2c -p sfc.vue
```

## 选项

- `-p, --path`: 指定要生成项目模板的文件路径（必填）。

- `-o, --output`: 指定生成项目模板的输出路径。如果未提供此选项，将在当前工作目录下生成模板。

- `-s, --syntax`: 指定是否输出使用 setup 语法的项目模板。如果提供了此选项，将生成带有 setup 语法的模板；否则，将生成默认模板。

## Example

Given the following file:

```vue cat tests/fixtures/example/input.vue
<script>
export default {
  props: {
    greeting: {
      type: String,
      default: 'Hello',
    },
  },
  data() {
    // this.initializing = true -- would make data() "complex" (need to improve)
    return {
      name: this.$route.query.name || 'John',
      watchMethod: 0,
      watchObject: {
        key: 1,
      },
    }
  },
  watch: {
    'watchMethod': function (v) {
      console.log('watchMethod', v)
    },
    'watchObject.key': {
      deep: true,
      immediate: true,
      async handler(v, ov) {
        console.log('watchObject', v, ov)
      },
    },
  },
  mounted() {
    this.meth()
    this.keyValue()
    delete this.initializing // should not become `delete initializing` (so use $this)
  },
  methods: {
    meth() {
      console.log(`${this.greeting} ${this.name} ${this.$el.clientHeight}`)
    },
    keyValue: async (a) => {
      await a
    },
  },
}
</script>

<template lang="pug">
div
  p Wonderful
</template>

<style scoped>
:root {
  background: red;
}
</style>
```

Will output the following:

```vue pnpm exec tsx src/cli.ts ./tests/fixtures/example/input.vue
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const props = withDefaults(defineProps<{
  greeting?: string
}>(), {
  greeting: 'Hello',
})

const $route = useRoute()
const $this = {}

const $el = ref<HTMLElement | undefined>()
const name = ref($route.query.name || 'John')
const watchMethod = ref(0)
const watchObject = ref({
  key: 1,
})

onMounted(() => {
  meth()
  keyValue()
  delete $this.initializing // should not become `delete initializing` (so use $this)
})

watch(() => watchMethod.value, (v) => {
  console.log('watchMethod', v)
})
watch(() => watchObject.value.key, async (v, ov) => {
  console.log('watchObject', v, ov)
}, {
  deep: true,
  immediate: true,
})

function meth() {
  console.log(`${props.greeting} ${name.value} ${$el.value.clientHeight}`)
}
async function keyValue(a) {
  await a
}
</script>

<template lang="pug">
div(ref="$el")
  p Wonderful
</template>

<style scoped>
:root {
  background: red;
}
</style>
```

output by syntax

```vue
<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api'

export default defineComponent({
  props: { greeting: { require: false, type: String, default: 'Hello' } },
  setup(props) {
    const $this = {}

    const watchMethod = ref(0)
    const watchObject = ref({
      key: 1,
    })

    onMounted(() => {
      meth()
      keyValue()
      delete $this.initializing // should not become `delete initializing` (so use $this)
    })

    function meth() {
      console.log(`${props.greeting} ${$this.name} ${$this.clientHeight}`)
    }
    async function keyValue(a) {
      await a
    }

    return {}
  },
})
</script>

<template>
  <div>
    <p>2</p>
  </div>
</template>

<style scoped>
:root {
    background: red;
}
</style>
```
