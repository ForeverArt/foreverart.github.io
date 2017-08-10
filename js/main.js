const BlogList = 'https://api.github.com/repos/ForeverArt/foreverart.github.io/issues?labels=blog'

const _API = {
    'BlogList': BlogList
}

let blog = Vue.component('blog', {
    props: ['blog'],
    template: '#blog_t',
    data: function () {
        return {
            reproduced: false,
            // html content
            html_content: '',
            // meta
            author: '',
            title: '',
            createDateStr: '',
            updateDateStr: ''
        }
    },
    created:function () {
        this.initialMeta(this.blog)
        let content = this.blog.body
        this.analyseContent(content)
    },
    methods: {
        dateFormat: function (value) {
            let date = new Date(value)
            return [date.getFullYear(), date.getMonth(), date.getDate()].join('-')
        },
        initialMeta: function (blog) {
            this.title = blog.title
            this.author = blog.user.login
            this.createDateStr = this.dateFormat(blog.created_at)
            this.updateDateStr = this.dateFormat(blog.updated_at)
        },
        analyseContent: function (content) {
            this.html_content = markdown.toHTML(content)
        },
        nextBlog: function (content) {
            let href = window.location.href
            if (href.indexOf('#') !== -1 && href.split('#')[1]) {
                let id = href.split('#')[1]
                let newId = id.split('_')[1] - 1
                newId = 'blog_' + newId
                main.scrollTo(newId)
                window.location.hash = newId
            } else {
                let newId = main.blogs[0].number - 1
                newId = 'blog_' + newId
                main.scrollTo(newId)
                window.location.hash = newId
            }
        },
        backTop: function () {
            $("html,body").animate({
                scrollTop: 0
            }, 1500)
            window.location.hash = ''
        }
    },
    computed: {
        meta: function () {
            return '由 ' + this.author + ' 撰写于 ' + this.createDateStr + '\t最后更新于 ' + this.updateDateStr
        }
    },
    watch: {
    },
})

let main = new Vue({
    el: '#app',
    components: {
        // <my-component> 将只在父模板可用
        'blog': blog
    },
    data: function () {
        return {
            blogs: [],
            currentBlog: {},
            showBlogDetail: false
        }
    },
    created: function () {
        // `this` 指向 vm 实例
        this.getBlogs()
    },
    methods: {
        chooseDetail: function (number) {
            if (event.target != this) {
                return
            }
            this.showBlogDetail = true
            for (let i = 0; i < this.blogs.length; i++) {
                if (this.blogs[i].number === number) {
                    this.currentBlog = this.blogs[i]
                    return ;
                }
            }
            alert('404 Not Found.')
        },
        backToBlogs: function () {
            this.showBlogDetail = false
        },
        getBlogs: function () {
            let self = this
            // self 指代this 否则由于闭包无法在下方匿名函数中使用
            $.get(_API.BlogList, function (blogArray) {
                if (blogArray) {
                    // console.log(blogArray)
                    self.blogs = blogArray
                    self.$nextTick(function () {
                        let href = window.location.href
                        if (href.indexOf('#') !== -1 && href.split('#')[1]) {
                            let id = href.split('#')[1]
                            console.log('redirect to anchor ' + id)
                            self.scrollTo(id)
                        }
                    })
                }
            })
        },
        scrollTo: function (id) {
            // document.getElementById(id).scrollIntoView()
            $("html,body").animate({
                scrollTop: $('#' + id).offset().top - 30
            },1000)
        }
    }
})
