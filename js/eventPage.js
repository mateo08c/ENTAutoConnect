chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.message) {
        case "clear_all":
            chrome.storage.sync.clear(function () {
                console.log("All data cleared")
            })
            break
        default:
            console.log(request)
            break
    }
});

/**
 * This function is called for this page: https://cas.monbureaunumerique.fr/login
 */
chrome.webNavigation.onCommitted.addListener(function (e) {
    console.log("Run script in : " + e.url)

    chrome.scripting.executeScript({
        target: {tabId: e.tabId},
        func: firstPage,
    });
}, {url: [{urlContains: 'https://cas.monbureaunumerique.fr/login'}]});

function firstPage() {
    function loading(value) {
        const loadingScreen = document.createElement("div")

        loadingScreen.style.position = "fixed"
        loadingScreen.style.top = "0"
        loadingScreen.style.left = "0"
        loadingScreen.style.width = "100%"
        loadingScreen.style.height = "100%"
        loadingScreen.style.backgroundColor = "rgba(0,0,0,0.5)"
        loadingScreen.style.zIndex = "10000";

        if (value) {
            document.body.appendChild(loadingScreen)
        } else {
            document.body.removeChild(loadingScreen)
        }
    }

    console.log("AutoLogin is running")

    loading(true)

    let radio = document.getElementById("idp-EDU")
    if (radio !== null) {
        radio.checked = true
    }

    let submit = document.getElementById("button-submit")
    if (submit !== null) {
        submit.click()
    }
}

/**
 * This function is called for this page: https://educonnect.education.gouv.fr/idp/profile/SAML2/POST/SSO
 */
chrome.webNavigation.onCommitted.addListener(function (e) {
    console.log("Run script in : " + e.url)

    chrome.scripting.executeScript({
        target: {tabId: e.tabId},
        func: secondPage,
    });
}, {url: [{urlContains: 'https://educonnect.education.gouv.fr/idp/profile/SAML2/POST/SSO'}]});

function secondPage() {
    console.log("AutoLogin is running")

    const customEvent = new Event('inputEvent', {
        'bubbles': true,
        'cancelable': true
    });

    const usernameInput = document.getElementById("username")
    const passwordInput = document.getElementById("password")

    const title = document.getElementById("titreLogin")

    const divProfil = document.getElementById("div_profil")
    const divConnexion = document.getElementById("div_connexion")

    const passwordError = document.getElementById("erreurMdp")
    const usernameError = document.getElementById("erreurIdentifiant")

    const submit = document.getElementById("bouton_valider")

    function loginFailed() {
        console.log("Login failed")
        title.innerHTML = "Echec de la connexion automatique, entrez vos identifiants"

        const popup = document.createElement("div")
        popup.style.padding = "20px"
        popup.style.width = "100%"
        popup.style.backgroundColor = "#ffffff"
        popup.style.position = "fixed"
        popup.style.display = "flex"
        popup.style.justifyContent = "center"
        popup.style.alignItems = "center"
        popup.style.fontSize = "20px"
        popup.style.borderBottom = "1px solid #e7e7e7"
        popup.style.boxShadow = "0 8px 8px 0 rgb(0 0 0 / 5%), 0 8px 16px -16px rgb(0 0 0 / 5%)"

        const text = document.createElement("p")
        text.style.margin = "0"
        text.style.color = "var(--error)"
        text.innerHTML = "La connexion automatique a échoué. Veuillez entrer vos identifiants et cliquer sur le bouton 'Se connecter' pour accéder à la page."
        popup.appendChild(text)

        const header = document.getElementById("header_connexion")
        header.appendChild(popup)

        document.body.style.paddingTop = "120px"
    }

    function saveInputs() {
        console.log("Saved: " + usernameInput.value + " " + passwordInput.value)
        chrome.storage.sync.set({
            data: {
                username: usernameInput.value,
                password: passwordInput.value
            }
        });
    }

    //set and hide the first div to choose the profil type
    sessionStorage.setItem('profilEduConnect', "eleve");
    divProfil?.classList.add("hidden-item")
    divConnexion?.classList.remove("hidden-item")


    //make event if input is edited
    document.addEventListener('input', function (e) {
        if (e.target.id === "username" || e.target.id === "password") {
            saveInputs()
        }
    })

    //check if all data are set
    document.addEventListener('inputEvent', function (e) {
        console.log(usernameInput.value, passwordInput.value)
        if (usernameInput.value !== "" && passwordInput.value !== "") {
            saveInputs()
            submit.click()

            if (!passwordError.hidden || !usernameError.hidden) {
                loginFailed()
                console.log("Login failed")
            }
        }
    })

    if (passwordError?.getAttribute("hidden") === "true" && usernameError?.getAttribute("hidden") === "true") {
        //get data from storage
        chrome.storage.sync.get(['data'], function (data) {
            if (data.password !== undefined || !data.username !== undefined) {
                usernameInput.value = data.data.username
                passwordInput.value = data.data.password

                document.dispatchEvent(customEvent)
                return
            }

            console.log("No data found")
        });
    } else {
        loginFailed()
    }
}

/**
 * This function is called for this page: https://cas.monbureaunumerique.fr/saml/SAMLAssertionConsumer
 */
chrome.webNavigation.onCommitted.addListener(function (e) {
    console.log("Run script in : " + e.url)

    chrome.scripting.executeScript({
        target: {tabId: e.tabId},
        func: thirdPage,
    });
}, {url: [{urlContains: 'https://cas.monbureaunumerique.fr/saml/SAMLAssertionConsumer'}]});

function thirdPage() {
    console.log("AutoLogin is running")

    function setPreviousUrl(url) {
        //set in data add new key
        chrome.storage.sync.set({
            previousUrl: url
        });

        console.log("Saved previous url: " + url)
    }

    chrome.storage.sync.get(['previousUrl'], function (data) {
        console.log("No previous url found, add listener for url change")

        function redirectURL(link){
            let timer = 6000
            let name = link.innerHTML

            const interval = setInterval(() => {
                timer -= 1000
                link.innerHTML = name + " (" + timer / 1000 + "s)"
                console.log("Redirect in " + timer / 1000 + "s")
                if (timer <= 0) {
                    clearInterval(interval)
                    link.click()
                }
            }, 1000);
        }

        //add listener to save the url when the user click on a link
        const links = document.querySelectorAll(".msg__content a")

        //add listener to all links
        for (let i = 0; i < links.length; i++) {
            const element = links[i];
            element.addEventListener("click", function (e) {
                setPreviousUrl(e.target.href)
                document.location.href = e.target.href
            })
        }

        //from the previous url, redirect to the correct page
        if (data.previousUrl !== undefined) {
            for (let i = 0; i < document.links.length; i++) {
                if (document.links[i].href.includes(data.previousUrl)) {
                    document.links[i].click()
                    return
                }
            }
        }

        //get first link and redirect to it
        if (links.length === 1) {
            console.log(links.length)
            links[0].click()
        }

        //for multiple links, redirect to the first one after 5s
        if (links.length > 0) {
            console.log("Redirect to: " + links[0].href)

            let link = links[0]
            setInterval(function () {
                link.style.color = link.style.color === "red" ? "black" : "red"
            }, 1000)

            redirectURL(link)
        }
    });

}

chrome.webNavigation.onCommitted.addListener(function (e) {
    console.log("Run script in : " + e.url)

    chrome.scripting.executeScript({
        target: {tabId: e.tabId},
        func: function (){
            window.location.href = "https://www.monbureaunumerique.fr/"
        },
    });

}, {url: [{urlContains: 'https://educonnect.education.gouv.fr/idp/profile/Logout'}]});

//Display data saved in storage
function displayData() {
    chrome.storage.sync.get(null, function (data) {
        console.log(data)

        console.log("Username: " + data.data.username ?? "undefined")
        console.log("Password: " + data.data.password ?? "undefined")

        console.log("Previous url: " + data.previousUrl ?? "undefined")
    })
}

