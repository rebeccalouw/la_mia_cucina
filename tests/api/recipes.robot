*** Settings ***
Documentation       /api/recipes — the recipe collection, its validation and its ownership rules.

Resource            ../resources/api.resource

Suite Setup         Start Recipe Suite
Suite Teardown      Delete Everything The Suite User Owns

Test Tags           api    recipes


*** Test Cases ***
Every Recipe Route Needs A Token
    [Template]    Request Without A Token Should Be Rejected
    GET       /api/recipes
    POST      /api/recipes
    GET       /api/recipes/1
    PUT       /api/recipes/1
    DELETE    /api/recipes/1

Creating A Recipe Returns Its Id And Title
    ${title}=    Unique Name    Ragu
    ${body}=    Create Dictionary
    ...    title=${title}
    ...    ingredients=Beef\nTomatoes
    ...    instructions=Brown the beef.\nSimmer for hours.
    ${response}=    Authorized POST    /api/recipes    ${body}    expected_status=201
    Should Be Equal    ${response.json()}[title]    ${title}
    Should Not Be Equal    ${response.json()}[id]    ${None}

A Created Recipe Reads Back With Every Field It Was Given
    ${title}=    Unique Name    Carbonara
    ${body}=    Create Dictionary
    ...    title=${title}
    ...    description=No cream.
    ...    ingredients=Guanciale\nPecorino\nEggs
    ...    instructions=Render the guanciale.\nToss off the heat.
    ...    prep_time=${15}
    ...    cook_time=${12}
    ...    servings=${4}
    ...    source_url=https://example.com/carbonara
    ${created}=    Authorized POST    /api/recipes    ${body}    expected_status=201
    ${recipe}=    Authorized GET    /api/recipes/${created.json()}[id]
    Should Be Equal    ${recipe.json()}[title]    ${title}
    Should Be Equal    ${recipe.json()}[description]    No cream.
    Should Be Equal    ${recipe.json()}[ingredients]    Guanciale\nPecorino\nEggs
    Should Be Equal    ${recipe.json()}[instructions]    Render the guanciale.\nToss off the heat.
    Should Be Equal As Integers    ${recipe.json()}[prep_time]    15
    Should Be Equal As Integers    ${recipe.json()}[cook_time]    12
    Should Be Equal As Integers    ${recipe.json()}[servings]    4
    Should Be Equal    ${recipe.json()}[source_url]    https://example.com/carbonara

Optional Fields Fall Back To Defaults
    ${body}=    Create Dictionary
    ...    title=Minimal
    ...    ingredients=Water
    ...    instructions=Boil it.
    ${created}=    Authorized POST    /api/recipes    ${body}    expected_status=201
    ${recipe}=    Authorized GET    /api/recipes/${created.json()}[id]
    Should Be Equal As Integers    ${recipe.json()}[prep_time]    0
    Should Be Equal As Integers    ${recipe.json()}[cook_time]    0
    Should Be Equal As Integers    ${recipe.json()}[servings]    1
    Should Be Equal    ${recipe.json()}[description]    ${EMPTY}

Creating A Recipe Without The Required Fields Is Rejected
    [Template]    Creating A Recipe Should Fail
    400    Title, ingredients, and instructions are required
    ...    ${EMPTY}    Flour    Bake it.
    400    Title, ingredients, and instructions are required
    ...    Nameless    ${EMPTY}    Bake it.
    400    Title, ingredients, and instructions are required
    ...    Nameless    Flour    ${EMPTY}

Creating A Recipe With Negative Times Or Servings Is Rejected
    [Documentation]    Negative timings and a negative serving count are refused before the
    ...    insert, so the row can never carry them.
    ${base}=    Create Dictionary    title=Bad Numbers    ingredients=Flour    instructions=Bake.
    FOR    ${field}    ${value}    IN
    ...    prep_time    ${-5}
    ...    cook_time    ${-1}
    ...    servings    ${-1}
        ${body}=    Copy Dictionary    ${base}
        Set To Dictionary    ${body}    ${field}    ${value}
        ${response}=    Authorized POST    /api/recipes    ${body}    expected_status=400
        Error Message Should Contain    ${response}    non-negative
    END

Zero Servings Is Stored As One Rather Than Rejected
    [Documentation]    Current behaviour, not an endorsement of it. `parseInt(0) || 1` treats a
    ...    zero as "not given", so the validation that claims servings must be at least one
    ...    never sees it and the recipe is saved with one serving instead of a 400.
    ${body}=    Create Dictionary
    ...    title=Zero Servings    ingredients=Flour    instructions=Bake.    servings=${0}
    ${created}=    Authorized POST    /api/recipes    ${body}    expected_status=201
    ${recipe}=    Authorized GET    /api/recipes/${created.json()}[id]
    Should Be Equal As Integers    ${recipe.json()}[servings]    1

The Recipe List Contains The Recipes The User Created
    ${first}=    Create A Recipe
    ${second}=    Create A Recipe
    ${response}=    Authorized GET    /api/recipes
    ${titles}=    Evaluate    [r['title'] for r in $response.json()]
    Should Contain    ${titles}    ${first}[title]
    Should Contain    ${titles}    ${second}[title]

The Recipe List Never Contains Another User's Recipes
    ${mine}=    Create A Recipe
    ${theirs}=    Create A Recipe    token=${OTHER}[token]
    ${response}=    Authorized GET    /api/recipes
    ${titles}=    Evaluate    [r['title'] for r in $response.json()]
    Should Contain    ${titles}    ${mine}[title]
    Should Not Contain    ${titles}    ${theirs}[title]

The Recipe List Can Be Searched By Title
    ${token}=    Unique Token
    ${wanted}=    Create A Recipe    title=Pistachio Cake ${token}
    Create A Recipe    title=Something Else Entirely
    ${params}=    Create Dictionary    search=Pistachio Cake ${token}
    ${response}=    Authorized GET    /api/recipes    params=${params}
    Length Should Be    ${response.json()}    1
    Should Be Equal    ${response.json()}[0][title]    ${wanted}[title]

Searching Is Case Insensitive
    ${token}=    Unique Token
    Create A Recipe    title=Focaccia ${token}
    ${params}=    Create Dictionary    search=focaccia ${token}
    ${response}=    Authorized GET    /api/recipes    params=${params}
    Length Should Be    ${response.json()}    1

Categories Given On Create Are Stored And Returned
    ${categories}=    Create List    Pasta    Weeknight
    ${created}=    Create A Recipe    categories=${categories}
    ${recipe}=    Authorized GET    /api/recipes/${created}[id]
    Should Contain    ${recipe.json()}[categories]    Pasta
    Should Contain    ${recipe.json()}[categories]    Weeknight

The Recipe List Can Be Filtered By Category
    ${label}=    Unique Name    Category
    ${categories}=    Create List    ${label}
    ${wanted}=    Create A Recipe    categories=${categories}
    Create A Recipe
    ${params}=    Create Dictionary    category=${label}
    ${response}=    Authorized GET    /api/recipes    params=${params}
    Length Should Be    ${response.json()}    1
    Should Be Equal    ${response.json()}[0][title]    ${wanted}[title]

A Recipe With No Categories Comes Back With An Empty List
    ${created}=    Create A Recipe
    ${response}=    Authorized GET    /api/recipes/${created}[id]
    Should Be Empty    ${response.json()}[categories]

Reading A Recipe That Does Not Exist Is A 404
    ${response}=    Authorized GET    /api/recipes/${UNUSED_ID}    expected_status=404
    Error Message Should Be    ${response}    Recipe not found

Reading Another User's Recipe Is Forbidden
    ${theirs}=    Create A Recipe    token=${OTHER}[token]
    ${response}=    Authorized GET    /api/recipes/${theirs}[id]    expected_status=403
    Error Message Should Be    ${response}    Unauthorized to view this recipe

Updating A Recipe Replaces Its Fields
    ${created}=    Create A Recipe
    ${body}=    Create Dictionary
    ...    title=Renamed
    ...    ingredients=Only water
    ...    instructions=Just wait.
    ...    prep_time=${1}
    ...    cook_time=${2}
    ...    servings=${3}
    ${response}=    Authorized PUT    /api/recipes/${created}[id]    ${body}
    Should Be Equal    ${response.json()}[message]    Recipe updated successfully
    ${recipe}=    Authorized GET    /api/recipes/${created}[id]
    Should Be Equal    ${recipe.json()}[title]    Renamed
    Should Be Equal    ${recipe.json()}[ingredients]    Only water
    Should Be Equal As Integers    ${recipe.json()}[servings]    3

Updating Categories Replaces Them Rather Than Adding To Them
    ${first}=    Create List    Pasta
    ${created}=    Create A Recipe    categories=${first}
    ${body}=    Create Dictionary
    ...    title=Recategorised
    ...    ingredients=Flour
    ...    instructions=Bake.
    ...    categories=${{ ['Dessert'] }}
    Authorized PUT    /api/recipes/${created}[id]    ${body}
    ${recipe}=    Authorized GET    /api/recipes/${created}[id]
    Should Contain    ${recipe.json()}[categories]    Dessert
    Should Not Contain    ${recipe.json()}[categories]    Pasta

Updating Without The Required Fields Is Rejected
    ${created}=    Create A Recipe
    ${body}=    Create Dictionary    title=${EMPTY}    ingredients=Flour    instructions=Bake.
    ${response}=    Authorized PUT    /api/recipes/${created}[id]    ${body}
    ...    expected_status=400
    Error Message Should Be    ${response}    Title, ingredients, and instructions are required

Updating A Recipe That Does Not Exist Is A 404
    ${body}=    Create Dictionary    title=Ghost    ingredients=Flour    instructions=Bake.
    ${response}=    Authorized PUT    /api/recipes/${UNUSED_ID}    ${body}    expected_status=404
    Error Message Should Be    ${response}    Recipe not found

Updating Another User's Recipe Is Forbidden
    ${theirs}=    Create A Recipe    token=${OTHER}[token]
    ${body}=    Create Dictionary    title=Hijacked    ingredients=Flour    instructions=Bake.
    ${response}=    Authorized PUT    /api/recipes/${theirs}[id]    ${body}    expected_status=403
    Error Message Should Be    ${response}    Unauthorized to update this recipe

Deleting A Recipe Removes It
    ${created}=    Create A Recipe
    ${response}=    Authorized DELETE    /api/recipes/${created}[id]
    Should Be Equal    ${response.json()}[message]    Recipe deleted successfully
    Authorized GET    /api/recipes/${created}[id]    expected_status=404

Deleting A Recipe That Does Not Exist Is A 404
    ${response}=    Authorized DELETE    /api/recipes/${UNUSED_ID}    expected_status=404
    Error Message Should Be    ${response}    Recipe not found

Deleting Another User's Recipe Is Forbidden
    ${theirs}=    Create A Recipe    token=${OTHER}[token]
    ${response}=    Authorized DELETE    /api/recipes/${theirs}[id]    expected_status=403
    Error Message Should Be    ${response}    Unauthorized to delete this recipe
    Authorized GET    /api/recipes/${theirs}[id]    token=${OTHER}[token]


*** Keywords ***
Start Recipe Suite
    Open API Session
    Register The Suite User    recipes
    ${other}=    Register A User    recipes-other
    VAR    ${OTHER}    ${other}    scope=SUITE
    # An id far beyond anything this suite creates, for the "not found" paths.
    VAR    ${UNUSED_ID}    99999999    scope=SUITE

Creating A Recipe Should Fail
    [Arguments]    ${status}    ${message}    ${title}    ${ingredients}    ${instructions}
    ${body}=    Create Dictionary
    ...    title=${title}    ingredients=${ingredients}    instructions=${instructions}
    ${response}=    Authorized POST    /api/recipes    ${body}    expected_status=${status}
    Error Message Should Be    ${response}    ${message}
