const PageList = 'https://api.github.com/repos/ForeverArt/foreverart.github.io/issues?labels=page'

const _API = {
    'PageList': PageList
}

let page = Vue.component('page', {
    props: ['page'],
    template: '#page_t',
    data: function () {
        return {
            // html content
            html_content: '',
            // meta
            title: '',
        }
    },
    created:function () {
        this.initialMeta(this.page)
        let content = this.page.body
        this.analyseContent(content)
    },
    methods: {
        initialMeta: function (page) {
            this.title = page.title
        },
        analyseContent: function (content) {
            this.html_content = markdown.toHTML(content)
        }
    }
})

let main = new Vue({
    el: '#app',
    components: {
        // <my-component> 将只在父模板可用
        'page': page
    },
    data: function () {
        return {
            pages: []
        }
    },
    created: function () {
        // `this` 指向 vm 实例
        this.getpages()
    },
    methods: {
        getpages: function () {
            let self = this
            // self 指代this 否则由于闭包无法在下方匿名函数中使用
            $.get(_API.PageList, function (pageArray) {
                if (pageArray) {
                    // console.log(pageArray)
                    self.pages = pageArray
                }
            })
        }
    }
})
