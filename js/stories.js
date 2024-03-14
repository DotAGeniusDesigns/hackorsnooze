"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  const canDelete = currentUser != null;
  const hostName = story.getHostName();
  const isFavorite = currentUser && currentUser.favorites.some(fav => fav.storyId === story.storyId);
  const deleteBtnHTML = (canDelete && story.username == currentUser.username) ? `<button class="delete-btn" data-story-id="${story.storyId}" aria-label="Delete story">X</button>` : '';
  const favoriteCheckboxHTML = currentUser ? `<input type="checkbox" class="favorite-checkbox" id="fav-${story.storyId}" ${isFavorite ? "checked" : ""} data-story-id="${story.storyId}"><label for="fav-${story.storyId}"></label>` : '';

  return $(`
    <li id="${story.storyId}">
      ${favoriteCheckboxHTML}
      <a href="${story.url}" target="a_blank" class="story-link">
        ${story.title}
      </a>
      ${deleteBtnHTML}
      <small class="story-hostname">(${hostName})</small>
      <small class="story-author">by ${story.author}</small>
      <small class="story-user">posted by ${story.username}</small>
    </li>
  `);
}





/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

async function addStoryToList(evt) {
  console.debug("addStoryToList", evt);
  evt.preventDefault();

  const title = $("#story-title").val();
  const author = $("#story-author").val();
  const url = $("#story-url").val();
  const story = new Story({ title, author, url });

  await storyList.addStory(currentUser, { title, author, url});
  storyList.stories.unshift(story);
  putStoriesOnPage();
  $storyForm.hide();
}

$storySubmitButton.on("click", addStoryToList);

$allStoriesList.on("change", ".favorite-checkbox", async function(evt) {
  const storyId = $(evt.target).data("story-id");
  const story = storyList.stories.find(s => s.storyId === storyId);

  if ($(evt.target).is(":checked")) {
    await addFavoriteStory(currentUser, story);
  } else {
    await removeFavoriteStory(currentUser, story);
  }
});


async function addFavoriteStory(user, story) {
  try {
    await axios.post(`${BASE_URL}/users/${user.username}/favorites/${story.storyId}`, { token: user.loginToken });
    user.favorites.push(story);
  } catch (error) {
    console.error("Error adding favorite story:", error);
  }
}

async function removeFavoriteStory(user, story) {
  try {
    await axios.delete(`${BASE_URL}/users/${user.username}/favorites/${story.storyId}`, { params: { token: user.loginToken } });
    user.favorites = user.favorites.filter(fav => fav.storyId !== story.storyId);
  } catch (error) {
    console.error("Error removing favorite story:", error);
  }
}


function showFavorites(evt) {
  console.debug("showFavorites", evt);
  hidePageComponents();
  $allStoriesList.empty();

  for (let story of currentUser.favorites) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

$body.on("click", "#nav-favorites", showFavorites);

function showMyStories(evt) {
  console.debug("showMyStories", evt);
  hidePageComponents();
  $allStoriesList.empty();

  // Directly use currentUser.ownStories if it's already populated
  for (let story of currentUser.ownStories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

$body.on("click", "#nav-my-stories", showMyStories);

async function deleteStory(storyId) {
  try {
    const response = await axios.delete(`${BASE_URL}/stories/${storyId}`, {
      params: { token: currentUser.loginToken },
    });
    console.log("Delete response", response);

    
    if (response.status === 200 || response.status === 204) {
      console.log("Story successfully deleted");
    } else {
      console.warn("Unexpected success status code:", response.status);
    }
  } catch (error) {
    console.error("Error deleting story:", error);
    alert("An error occurred while deleting the story.");
    return;
  }
}



$allStoriesList.on("click", ".delete-btn", async function(evt) {
  const storyId = $(evt.target).data("story-id");

  if (confirm("Are you sure you want to delete this story?")) {
    await deleteStory(storyId);
    $(evt.target).closest("li").remove();
  }
});
