*** Settings ***
Documentation       Shared session, authentication and request keywords for the La Mia Cucina API.
...
...                 Every suite registers its own user in its setup, so suites are independent of
...                 each other and of any data already in the database.

Library             RequestsLibrary
Library             Collections
Library             testdata.py


*** Variables ***
${BASE_URL}         http://localhost:3000
${SESSION}          cucina
${PASSWORD}         RobotPassw0rd!


*** Keywords ***
Open API Session
    [Documentation]    Suite setup. Opens the HTTP session and fails with a readable message if
    ...    the app is not running, rather than letting every test fail on a connection error.
    Create Session    ${SESSION}    ${BASE_URL}    timeout=${20}
    ${status}    ${_}=    Run Keyword And Ignore Error
    ...    GET On Session    ${SESSION}    /api/categories    expected_status=any
    IF    '${status}' == 'FAIL'
        Fail    No app reachable at ${BASE_URL}. Start it with `npm run dev`.
    END

Close API Session
    Delete All Sessions

Register A User
    [Documentation]    Registers a new user with a unique email and returns its token, id and
    ...    credentials as a dictionary.
    [Arguments]    ${prefix}=rf
    ${email}=    Unique Email    ${prefix}
    ${name}=    Unique Name    Robot
    ${body}=    Create Dictionary    email=${email}    password=${PASSWORD}    name=${name}
    ${response}=    POST On Session    ${SESSION}    /api/auth/register    json=${body}
    ...    expected_status=201
    ${user}=    Create Dictionary
    ...    id=${response.json()}[user][id]
    ...    email=${email}
    ...    name=${name}
    ...    password=${PASSWORD}
    ...    token=${response.json()}[token]
    RETURN    ${user}

Register The Suite User
    [Documentation]    Registers the user that the suite's tests act as, and exposes its token
    ...    as ${TOKEN} so the request keywords can default to it.
    [Arguments]    ${prefix}=rf
    ${user}=    Register A User    ${prefix}
    VAR    ${USER}    ${user}    scope=SUITE
    VAR    ${TOKEN}    ${user}[token]    scope=SUITE
    RETURN    ${user}

Log In As
    [Arguments]    ${email}    ${password}    ${expected_status}=200
    ${body}=    Create Dictionary    email=${email}    password=${password}
    ${response}=    POST On Session    ${SESSION}    /api/auth/login    json=${body}
    ...    expected_status=${expected_status}
    RETURN    ${response}

Bearer Headers
    [Arguments]    ${token}=${TOKEN}
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}
    RETURN    ${headers}


# Request wrappers. Each takes the token to send and the status to expect, so the authorised
# and the rejected paths of an endpoint are written the same way.

Authorized GET
    [Arguments]    ${path}    ${expected_status}=200    ${params}=${None}    ${token}=${TOKEN}
    ${headers}=    Bearer Headers    ${token}
    ${response}=    GET On Session    ${SESSION}    ${path}    headers=${headers}
    ...    params=${params}    expected_status=${expected_status}
    RETURN    ${response}

Authorized POST
    [Arguments]    ${path}    ${body}    ${expected_status}=200    ${token}=${TOKEN}
    ${headers}=    Bearer Headers    ${token}
    ${response}=    POST On Session    ${SESSION}    ${path}    json=${body}    headers=${headers}
    ...    expected_status=${expected_status}
    RETURN    ${response}

Authorized PUT
    [Arguments]    ${path}    ${body}    ${expected_status}=200    ${token}=${TOKEN}
    ${headers}=    Bearer Headers    ${token}
    ${response}=    PUT On Session    ${SESSION}    ${path}    json=${body}    headers=${headers}
    ...    expected_status=${expected_status}
    RETURN    ${response}

Authorized DELETE
    [Arguments]    ${path}    ${expected_status}=200    ${token}=${TOKEN}
    ${headers}=    Bearer Headers    ${token}
    ${response}=    DELETE On Session    ${SESSION}    ${path}    headers=${headers}
    ...    expected_status=${expected_status}
    RETURN    ${response}


# Assertions

Request Without A Token Should Be Rejected
    [Documentation]    Every route except register, login, logout and the password reset pair
    ...    sits behind `isAuthenticated`, which answers 401 with an AUTH_MISSING code.
    [Arguments]    ${method}    ${path}
    ${response}=    Run Keyword    ${method} On Session    ${SESSION}    ${path}
    ...    expected_status=401
    Should Be Equal    ${response.json()}[code]    AUTH_MISSING

Error Message Should Be
    [Arguments]    ${response}    ${expected}
    Should Be Equal    ${response.json()}[error]    ${expected}

Error Message Should Contain
    [Arguments]    ${response}    ${expected}
    Should Contain    ${response.json()}[error]    ${expected}    ignore_case=${True}


# Fixtures

Create A Recipe
    [Documentation]    Creates a recipe for the current suite user and returns its id and title.
    [Arguments]    ${title}=${None}    ${categories}=${None}    ${token}=${TOKEN}
    IF    $title is None
        ${title}=    Unique Name    Recipe
    END
    ${body}=    Create Dictionary
    ...    title=${title}
    ...    ingredients=200g flour\n2 eggs
    ...    instructions=Mix it.\nCook it.
    ...    description=Created by the Robot Framework suite.
    ...    prep_time=${10}
    ...    cook_time=${20}
    ...    servings=${2}
    IF    $categories is not None
        Set To Dictionary    ${body}    categories=${categories}
    END
    ${response}=    Authorized POST    /api/recipes    ${body}    expected_status=201
    ...    token=${token}
    ${recipe}=    Create Dictionary    id=${response.json()}[id]    title=${title}
    RETURN    ${recipe}

Create A Freezer Item
    [Documentation]    Creates a freezer item for the current suite user and returns it.
    [Arguments]    ${type}=meal    ${name}=${None}    ${categories}=${None}    ${token}=${TOKEN}
    IF    $name is None
        ${name}=    Unique Name    Frozen
    END
    ${body}=    Create Dictionary    name=${name}    type=${type}
    IF    $categories is not None
        Set To Dictionary    ${body}    categories=${categories}
    END
    ${response}=    Authorized POST    /api/freezer    ${body}    expected_status=201
    ...    token=${token}
    ${item}=    Create Dictionary    id=${response.json()}[id]    name=${name}    type=${type}
    RETURN    ${item}

Delete Everything The Suite User Owns
    [Documentation]    Suite teardown. Removes the meal plans, freezer items and recipes created
    ...    by the run, so a shared development database does not fill up. The user row itself
    ...    stays: the API has no endpoint that deletes an account.
    Run Keyword And Warn On Failure    Delete All Meal Plans
    Run Keyword And Warn On Failure    Delete All Freezer Items
    Run Keyword And Warn On Failure    Delete All Recipes
    Close API Session

Delete All Meal Plans
    ${response}=    Authorized GET    /api/planner
    FOR    ${plan}    IN    @{response.json()}
        Authorized DELETE    /api/planner/${plan}[id]    expected_status=any
    END

Delete All Freezer Items
    ${response}=    Authorized GET    /api/freezer
    FOR    ${item}    IN    @{response.json()}
        Authorized DELETE    /api/freezer/${item}[id]    expected_status=any
    END

Delete All Recipes
    ${response}=    Authorized GET    /api/recipes
    FOR    ${recipe}    IN    @{response.json()}
        Authorized DELETE    /api/recipes/${recipe}[id]    expected_status=any
    END
