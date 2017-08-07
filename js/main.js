var Blog = Vue.component('Blog', {
    template: '#blog_t',
    data: function () {
        return {
            title: '',
            meta: '',
            lead: '',
            abstract: '',
            content: ''
        }
    },
    created:function () {
        this.title = '洛神赋'
        this.meta = '由 曹植 撰写于 2012年12月12日 | 发表在 博客'
        this.lead = '黄初三年，余朝京师，还济洛川。古人有言，斯水之神，名曰宓妃。感宋玉对楚王神女之事，遂作斯赋，其词曰：'
        this.abstract = '黄初三年，余朝京师，还济洛川。古人有言，斯水之神，名曰宓妃。感宋玉对楚王神女之事，遂作斯赋，其词曰：'
        this.content = '余从京域，言归东藩，背伊阙 ，越轘辕，经通谷，陵景山。\
        日既西倾，车殆马烦。尔乃税驾乎蘅皋，秣驷乎芝田，容与乎阳林，流眄乎洛川。\
        于是精移神骇，忽焉思散。俯则未察，仰以殊观。睹一丽人，于岩之畔。乃援御者\
        而告之曰：“尔有觌于彼者乎？彼何人斯，若此之艳也！”御者对曰：“臣闻河洛之\
        神，名曰宓妃。然则君王所见，无乃是乎？其状若何，臣愿闻之。”'
    }
})

var Blogs = Vue.component('Blogs', {
    // 选项
    template: '#blogs_t',
    component: {
        'Blog': Blog
    },
    data: function () {
        return {
            blogArray: [0, 1, 2, 3, 4]
        }
    },
})

var main = new Vue({
    el: '#app',
    components: {
        // <my-component> 将只在父模板可用
        'Blogs': Blogs
    },
    data: function () {
        return {
            currentRoute: window.location.pathname,
            blogArray: [0, 1, 2, 3, 4]
        }
    },
    created: function () {
        // `this` 指向 vm 实例
        console.log(this.currentRoute)
    }
})
