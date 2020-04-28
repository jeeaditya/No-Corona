import axios from 'axios'

export default class RegistrationForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElements()
        this.username = document.querySelector('#username-register')
        this.username.previousValue = ""
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""
        this.occupation = document.querySelector("#occupation-register")
        this.occupation.previousValue = ""
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }

    //Events
    events() {
        this.form.addEventListener("submit",(e)=>{
            e.preventDefault()
            this.formSubmitHandler()
        })

        //keyup event
        this.occupation.addEventListener("keyup", ()=>{
            this.isDifferent(this.occupation, this.occupationHandler)
        })
        this.password.addEventListener("keyup", ()=>{
            this.isDifferent(this.password, this.passwordHandler)
        })
        this.username.addEventListener("keyup", ()=>{
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener("keyup", ()=>{
            this.isDifferent(this.email, this.emailHandler)
        })

        //blur event
        this.occupation.addEventListener("blur", ()=>{
            this.isDifferent(this.occupation, this.occupationHandler)
        })
        this.password.addEventListener("blur", ()=>{
            this.isDifferent(this.password, this.passwordHandler)
        })
        this.username.addEventListener("blur", ()=>{
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener("blur", ()=>{
            this.isDifferent(this.email, this.emailHandler)
        })
    }


    //Methods
    formSubmitHandler(){
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.occupationImmediately()
        this.occupationAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        if(
            this.username.isUnique && 
            !this.username.errors && 
            !this.occupation.errors &&
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
        ) {
            this.form.submit()
        }
    }

    isDifferent(el, handler) {
        if(el.previousValue != el.value){
            handler.call(this)
        }
        el.previousValue = el.value
    }

    usernameHandler(){
        this.username.errors = false
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(()=> this.usernameAfterDelay(), 800)
    }

    occupationHandler(){
        this.occupation.errors = false
        this.occupationImmediately()
        clearTimeout(this.occupation.timer)
        this.occupation.timer = setTimeout(()=> this.occupationAfterDelay(), 800)
    }

    emailHandler(){
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(()=> this.emailAfterDelay(), 500)
    }

    passwordHandler(){
        this.password.errors = false
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(()=> this.passwordAfterDelay(), 800)
    }

    passwordImmediately(){
        if(this.password.value.length > 50){
            this.showValidationError(this.password,"Password cannot exceed 50 characters")
        }

        if(!this.password.errors){
            this.hideValidationError(this.password)
        }
    }

    occupationImmediately(){
        if(this.occupation.value != "" && !/^([a-zA-Z\s]+)$/.test(this.occupation.value)) {
            this.showValidationError(this.occupation, "Enter valid Occupation/Authority")
        }

        if(this.occupation.value.length > 30){
            this.showValidationError(this.occupation,"Occupation cannot exceed 30 characters")
        }

        if(!this.occupation.errors){
            this.hideValidationError(this.occupation)
        }
    }

    passwordAfterDelay(){
        if(this.password.value.length < 8) {
            this.showValidationError(this.password,"Password must be atleast 8 characters.")
        }
    }

    occupationAfterDelay(){
        if(this.occupation.value.length < 2) {
            this.showValidationError(this.occupation,"Enter valid Authority or Occupation.")
        }
    }

    emailAfterDelay(){
        if(!/^\S+@\S+$/.test(this.email.value)){
            this.showValidationError(this.email, "Enter a valid email address.")
        }

        if(!this.email.errors){
            axios.post('/doesEmailExist',{_csrf: this._csrf, email: this.email.value}).then( response =>{
                if(response.data){
                    this.email.isUnique = false
                    this.showValidationError(this.email, "The email is already taken.")
                } else {
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            }).catch(()=>{
                console.log("Please try again later.")
            })
        }
    }

    usernameImmediately(){
        if(this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
            this.showValidationError(this.username, "Username can only be Alphanumeric")
        }

        if(this.username.value.length > 30){
            this.showValidationError(this.username, "Username cannot exceed 30 characters.")
        }

        if(!this.username.errors){
            this.hideValidationError(this.username)
        }
    }

    hideValidationError(el){
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    showValidationError(el, message) {
        el.nextElementSibling.innerHTML = message;
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        el.errors = true
    }

    usernameAfterDelay(){
        if(this.username.value.length < 3){
            this.showValidationError(this.username, "Username must be atleast 3 characters.")
        }

        if(!this.username.errors){
            axios.post('/doesUsernameExist', {_csrf: this._csrf,username: this.username.value}).then((response)=>{
                if(response.data) {
                    this.showValidationError(this.username,"Username is already taken")
                    this.username.isUnique = false
                } else{
                    this.username.isUnique = true
                }
            }).catch(()=>{
                console.log("Please Try Again Later")
            })
        }
    }

    insertValidationElements(){
        this.allFields.forEach((el)=>{
            el.insertAdjacentHTML("afterend", `<div class="alert alert-danger small liveValidateMessage "></div>`)
        })
    }
}