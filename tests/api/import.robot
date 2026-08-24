*** Settings ***
Documentation       /api/import — recipe scraping, and the checks that stop it being used to
...                 reach inside the network.

Resource            ../resources/api.resource

Suite Setup         Start Import Suite
Suite Teardown      Close API Session

Test Tags           api    import


*** Test Cases ***
Importing Needs A Token
    Request Without A Token Should Be Rejected    POST    /api/import/preview

A Request Without A URL Is Rejected
    ${body}=    Create Dictionary    url=${EMPTY}
    ${response}=    Authorized POST    /api/import/preview    ${body}    expected_status=400
    Error Message Should Be    ${response}    URL is required

Something That Is Not A URL Is Rejected
    [Template]    Importing Should Be Refused
    not a url
    example.com/recipe
    ${SPACE}

Only Http And Https Can Be Imported
    [Template]    Importing Should Be Refused
    ftp://example.com/recipe.html
    file:///etc/passwd
    data:text/html,<html></html>

A URL Carrying Credentials Is Rejected
    ${response}=    Importing Should Be Refused    https://user:secret@example.com/recipe
    Error Message Should Contain    ${response}    username or password

Addresses Inside The Network Are Refused
    [Documentation]    The guard resolves the host and rejects loopback, private, carrier-grade
    ...    NAT and link-local ranges, which is what keeps the importer from reaching the app's
    ...    own machine or a cloud metadata service.
    [Template]    Import Should Be Refused As Private
    http://127.0.0.1/recipe
    http://localhost:3000/api/recipes
    http://10.0.0.1/recipe
    http://172.16.0.1/recipe
    http://192.168.1.1/recipe
    http://169.254.169.254/latest/meta-data/
    http://100.64.0.1/recipe
    http://[::1]/recipe

A Host That Does Not Resolve Is Rejected
    ${response}=    Importing Should Be Refused
    ...    https://this-host-does-not-exist.robot.invalid/recipe
    Error Message Should Contain    ${response}    could not be found

A Page Without A Recipe Comes Back Without One
    [Documentation]    Reaches the public internet, so it is tagged `network` and can be left
    ...    out with `--exclude network`.
    [Tags]    network
    ${body}=    Create Dictionary    url=https://example.com/
    ${response}=    Authorized POST    /api/import/preview    ${body}    expected_status=any
    IF    ${response.status_code} in (502, 504)
        Skip    example.com was not reachable, so there is nothing to assert.
    END
    Should Be Equal As Integers    ${response.status_code}    200
    Dictionary Should Contain Key    ${response.json()}    html


*** Keywords ***
Start Import Suite
    Open API Session
    Register The Suite User    import

Importing Should Be Refused
    [Documentation]    Every unusable URL is reported as a 400 with a readable reason, never as
    ...    a 500.
    [Arguments]    ${url}
    ${body}=    Create Dictionary    url=${url}
    ${response}=    Authorized POST    /api/import/preview    ${body}    expected_status=400
    RETURN    ${response}

Import Should Be Refused As Private
    [Arguments]    ${url}
    ${response}=    Importing Should Be Refused    ${url}
    Error Message Should Contain    ${response}    private network
