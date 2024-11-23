//import thư viện express
const express = require('express');
//tạo một router module riêng 
const user_route = express();

//thư viện middleware để xử lý dữ liệu từ body của HTTP request
const bodyParser = require('body-parser');

const session = require('express-session');
const{SESSION_SECRET} = process.env;
user_route.use(session({ secret:SESSION_SECRET}))


user_route.use(bodyParser.json()); //json(): Xử lý các request có dữ liệu dạng JSON.
user_route.use(bodyParser.urlencoded({ extended:true} )); //urlencoded({ extended: true }): Xử lý dữ liệu gửi lên từ form với định dạng application/x-www-form-urlencoded.

user_route.set('view engine','ejs'); //Thiết lập EJS (Embedded JavaScript) làm engine để render các file giao diện
user_route.set('views','./views'); //Chỉ định thư mục chứa các file giao diện là ./views.

user_route.use(express.static('public')); //Cấu hình để phục vụ các file tĩnh (CSS, JavaScript, hình ảnh) từ thư mục public.

const path = require('path'); //Thư viện có sẵn trong Node.js, dùng để xử lý đường dẫn file và thư mục.
const multer = require('multer'); //Thư viện middleware dùng để xử lý file upload (dùng cho việc xử lý file gửi từ client lên server).


//Cấu hình file upload vào hệ thống 
const storage = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null,path.join(__dirname,'../public/images'));
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
});

const upload = multer({ storage:storage});

const userController = require('../controllers/userController');

const auth  = require('../milddewares/auth');

user_route.get('/register',auth.isLogout, userController.registerLoad);
user_route.post('/register', upload.single('image'),userController.register);

user_route.get('/',auth.isLogout,userController.loadLogin);
user_route.post('/',userController.login);
user_route.get('/logout',auth.isLogin,userController.logout);

user_route.get('/dashboard',auth.isLogin,userController.loadDashboard);
user_route.post('/save-chat',userController.saveChat);


user_route.get('*',function(req,res){
    res.redirect('/');
});

module.exports = user_route;