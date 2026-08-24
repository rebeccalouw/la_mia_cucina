*** Settings ***
Documentation       /api/auth — registration, login, session, profile and password reset.

Resource            ../resources/api.resource

Suite Setup         Open API Session
Suite Teardown      Close API Session

Test Tags           api    auth


*** Test Cases ***
Registering Returns A Token And The New User
    ${email}=    Unique Email    register
    ${body}=    Create Dictionary    email=${email}    password=${PASSWORD}    name=Aurelia
    ${response}=    POST On Session    ${SESSION}    /api/auth/register    json=${body}
    ...    expected_status=201
    Should Be Equal    ${response.json()}[user][email]    ${email}
    Should Be Equal    ${response.json()}[user][name]    Aurelia
    Should Not Be Empty    ${response.json()}[token]
    Dictionary Should Not Contain Key    ${response.json()}[user]    password

Registering Without Every Field Is Rejected
    [Template]    Registration Should Fail With 400
    ${EMPTY}                    ${PASSWORD}    Aurelia
    nobody@robot.invalid        ${EMPTY}       Aurelia
    nobody@robot.invalid        ${PASSWORD}    ${EMPTY}

Registering A Known Email Is A Conflict
    ${user}=    Register A User    duplicate
    ${body}=    Create Dictionary
    ...    email=${user}[email]    password=${PASSWORD}    name=Someone Else
    ${response}=    POST On Session    ${SESSION}    /api/auth/register    json=${body}
    ...    expected_status=409
    Error Message Should Be    ${response}    Email already exists

Logging In With The Right Password Returns A Token
    ${user}=    Register A User    login
    ${response}=    Log In As    ${user}[email]    ${PASSWORD}
    Should Be Equal    ${response.json()}[user][email]    ${user}[email]
    Should Be Equal As Integers    ${response.json()}[user][id]    ${user}[id]
    Should Not Be Empty    ${response.json()}[token]

Logging In With The Wrong Password Is Rejected
    ${user}=    Register A User    login
    ${response}=    Log In As    ${user}[email]    not-the-password    expected_status=401
    Error Message Should Be    ${response}    Invalid email or password

Logging In As An Unknown Email Is Rejected
    [Documentation]    The message is deliberately the same as for a wrong password, so the
    ...    endpoint cannot be used to discover which addresses are registered.
    ${email}=    Unique Email    never-registered
    ${response}=    Log In As    ${email}    ${PASSWORD}    expected_status=401
    Error Message Should Be    ${response}    Invalid email or password

Logging In Without Credentials Is Rejected
    ${body}=    Create Dictionary    email=nobody@robot.invalid
    ${response}=    POST On Session    ${SESSION}    /api/auth/login    json=${body}
    ...    expected_status=400
    Error Message Should Be    ${response}    Email and password are required

Logging Out Succeeds
    [Documentation]    Sessions are stateless JWTs, so logout only acknowledges the client.
    ${response}=    POST On Session    ${SESSION}    /api/auth/logout    expected_status=200
    Should Be Equal    ${response.json()}[message]    Logged out successfully

The Current User Is Read From The Token
    ${user}=    Register A User    me
    ${response}=    Authorized GET    /api/auth/me    token=${user}[token]
    Should Be Equal As Integers    ${response.json()}[id]    ${user}[id]
    Should Be Equal    ${response.json()}[email]    ${user}[email]
    Should Be Equal    ${response.json()}[name]    ${user}[name]

A Missing Token Is Rejected
    Request Without A Token Should Be Rejected    GET    /api/auth/me

A Forged Token Is Rejected
    ${headers}=    Create Dictionary    Authorization=Bearer not.a.jwt
    ${response}=    GET On Session    ${SESSION}    /api/auth/me    headers=${headers}
    ...    expected_status=401
    Should Be Equal    ${response.json()}[code]    AUTH_INVALID

A Token Sent Without The Bearer Scheme Is Rejected
    ${user}=    Register A User    scheme
    ${headers}=    Create Dictionary    Authorization=${user}[token]
    ${response}=    GET On Session    ${SESSION}    /api/auth/me    headers=${headers}
    ...    expected_status=401
    Should Be Equal    ${response.json()}[code]    AUTH_MISSING

Updating The Profile Renames The User And Reissues The Token
    ${user}=    Register A User    profile
    ${body}=    Create Dictionary    name=Nonna Rosa
    ${response}=    Authorized POST    /api/auth/update-profile    ${body}    token=${user}[token]
    Should Be Equal    ${response.json()}[user][name]    Nonna Rosa
    Should Not Be Empty    ${response.json()}[token]
    ${reread}=    Authorized GET    /api/auth/me    token=${response.json()}[token]
    Should Be Equal    ${reread.json()}[name]    Nonna Rosa

Updating The Profile Without A Name Is Rejected
    ${user}=    Register A User    profile
    ${body}=    Create Dictionary    name=${EMPTY}
    ${response}=    Authorized POST    /api/auth/update-profile    ${body}    expected_status=400
    ...    token=${user}[token]
    Error Message Should Be    ${response}    Name is required

Changing The Password Lets The New One Log In
    ${user}=    Register A User    password
    ${body}=    Create Dictionary    currentPassword=${PASSWORD}    newPassword=Brand-New-1
    ${response}=    Authorized POST    /api/auth/change-password    ${body}    token=${user}[token]
    Should Be Equal    ${response.json()}[message]    Password updated successfully
    Log In As    ${user}[email]    Brand-New-1
    Log In As    ${user}[email]    ${PASSWORD}    expected_status=401

Changing The Password With The Wrong Current One Is Rejected
    ${user}=    Register A User    password
    ${body}=    Create Dictionary    currentPassword=wrong    newPassword=Brand-New-1
    ${response}=    Authorized POST    /api/auth/change-password    ${body}    expected_status=401
    ...    token=${user}[token]
    Error Message Should Be    ${response}    Incorrect current password
    Log In As    ${user}[email]    ${PASSWORD}

Changing The Password Needs Both Fields
    ${user}=    Register A User    password
    ${body}=    Create Dictionary    newPassword=Brand-New-1
    ${response}=    Authorized POST    /api/auth/change-password    ${body}    expected_status=400
    ...    token=${user}[token]
    Error Message Should Be    ${response}    All fields are required

Forgotten Password Answers The Same Way For Known And Unknown Emails
    [Documentation]    Both replies are generic on purpose: a different answer for a registered
    ...    address would leak who has an account.
    ${user}=    Register A User    forgot
    ${known}=    Create Dictionary    email=${user}[email]
    ${stranger}=    Unique Email    no-such
    ${unknown}=    Create Dictionary    email=${stranger}
    ${response}=    POST On Session    ${SESSION}    /api/auth/forgot-password    json=${known}
    ...    expected_status=200
    Should Contain    ${response.json()}[message]    If that email exists in our records
    ${response}=    POST On Session    ${SESSION}    /api/auth/forgot-password    json=${unknown}
    ...    expected_status=200
    Should Contain    ${response.json()}[message]    If that email exists in our records

Forgotten Password Without An Email Is Rejected
    ${body}=    Create Dictionary    email=${EMPTY}
    ${response}=    POST On Session    ${SESSION}    /api/auth/forgot-password    json=${body}
    ...    expected_status=400
    Error Message Should Be    ${response}    Email is required

Resetting With An Unknown Token Is Rejected
    ${body}=    Create Dictionary    token=nope-not-a-real-token    newPassword=Brand-New-1
    ${response}=    POST On Session    ${SESSION}    /api/auth/reset-password    json=${body}
    ...    expected_status=400
    Error Message Should Be    ${response}    Invalid or expired reset token

Resetting Needs Both A Token And A Password
    ${body}=    Create Dictionary    token=nope-not-a-real-token
    ${response}=    POST On Session    ${SESSION}    /api/auth/reset-password    json=${body}
    ...    expected_status=400
    Error Message Should Be    ${response}    Token and new password are required


*** Keywords ***
Registration Should Fail With 400
    [Arguments]    ${email}    ${password}    ${name}
    ${body}=    Create Dictionary    email=${email}    password=${password}    name=${name}
    ${response}=    POST On Session    ${SESSION}    /api/auth/register    json=${body}
    ...    expected_status=400
    Error Message Should Be    ${response}    All fields are required
