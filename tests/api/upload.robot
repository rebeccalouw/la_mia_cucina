*** Settings ***
Documentation       /api/upload — image upload, which answers with a base64 data URI rather than
...                 storing a file.

Resource            ../resources/api.resource
Library             OperatingSystem

Suite Setup         Start Upload Suite
Suite Teardown      Close API Session

Test Tags           api    upload


*** Test Cases ***
Uploading Needs A Token
    Request Without A Token Should Be Rejected    POST    /api/upload

An Image Comes Back As A Data URI
    ${response}=    Upload    pixel.png    image/png
    Should Start With    ${response.json()}[url]    data:image/png;base64,
    ${encoded}=    Evaluate    $response.json()['url'].split(',', 1)[1]
    ${decoded}=    Evaluate    __import__('base64').b64decode($encoded)
    ${path}=    Fixture Path    pixel.png
    ${original}=    Get Binary File    ${path}
    Should Be Equal    ${decoded}    ${original}

A Request With No File Is Rejected
    ${headers}=    Bearer Headers
    ${response}=    POST On Session    ${SESSION}    /api/upload    headers=${headers}
    ...    expected_status=400
    Error Message Should Be    ${response}    No file uploaded

A File That Is Not An Image Is Refused
    [Documentation]    The filter checks both the extension and the content type, and the error
    ...    handler turns its rejection into a 415 with JSON rather than an HTML stack trace.
    ${response}=    Upload    not-an-image.txt    text/plain    expected_status=415
    Error Message Should Contain    ${response}    Only images are allowed

An Image Renamed To A Png Is Still Refused
    [Documentation]    A .png extension with a non-image content type must not get through.
    ${response}=    Upload    not-an-image.txt    text/plain    filename=disguised.png
    ...    expected_status=415
    Error Message Should Contain    ${response}    Only images are allowed

An Image Over The Two Megabyte Limit Is Refused
    ${path}=    Oversized Png Path
    ${response}=    Upload Path    ${path}    image/png    expected_status=413
    Error Message Should Be    ${response}    That image is too large. The limit is 2 MB.


*** Keywords ***
Start Upload Suite
    Open API Session
    Register The Suite User    upload

Upload
    [Documentation]    Posts a file from the fixtures directory as multipart form data.
    [Arguments]    ${fixture}    ${content_type}    ${expected_status}=200    ${filename}=${None}
    ${path}=    Fixture Path    ${fixture}
    ${response}=    Upload Path    ${path}    ${content_type}    ${expected_status}    ${filename}
    RETURN    ${response}

Upload Path
    [Arguments]    ${path}    ${content_type}    ${expected_status}=200    ${filename}=${None}
    IF    $filename is None
        ${filename}=    Evaluate    __import__('os').path.basename($path)
    END
    ${content}=    Get Binary File    ${path}
    ${files}=    Evaluate    {'image': ($filename, $content, $content_type)}
    ${headers}=    Bearer Headers
    ${response}=    POST On Session    ${SESSION}    /api/upload    files=${files}
    ...    headers=${headers}    expected_status=${expected_status}
    RETURN    ${response}
