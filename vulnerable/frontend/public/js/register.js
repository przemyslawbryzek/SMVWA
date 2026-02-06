document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.querySelector("[name=password]").value;
  const confirmPassword = document.querySelector("[name=confirm_password]").value;

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  const formData = {
    username: document.querySelector("[name=username]").value,
    email: document.querySelector("[name=email]").value,
    password: password,
    confirm_password: confirmPassword
  };

  try {
    await axios.post(`${API_URL}/auth/register`, formData);
    window.location.href = "/login";
  } catch (error) {
    alert(error.response?.data?.error || "Registration failed");
  }
});
